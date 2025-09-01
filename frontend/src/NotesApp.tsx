import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Mic as MicIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  TextSnippet as TextIcon,
  AutoAwesome as AIIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import { Note, MediaContent } from './types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteOpen, setNewNoteOpen] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [currentNoteContents, setCurrentNoteContents] = useState<MediaContent[]>([]);
  const [newTextContent, setNewTextContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadingType, setUploadingType] = useState<string>('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteDetailOpen, setNoteDetailOpen] = useState<boolean>(false);
  const [noteMessages, setNoteMessages] = useState<Message[]>([]);
  const [noteChatInput, setNoteChatInput] = useState<string>('');
  const [noteChatLoading, setNoteChatLoading] = useState<boolean>(false);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [editingNoteTitle, setEditingNoteTitle] = useState<string>('');
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingContentText, setEditingContentText] = useState<string>('');

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

  // Update filtered notes when notes or search changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
    } else {
      // Smart filtering will be handled by semantic search
      setFilteredNotes(notes);
    }
  }, [notes, searchQuery]);

  const fetchNotes = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/v1/notes`);
      if (res.ok) {
        const data: Note[] = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to load notes', err);
    }
  };

  // Semantic search function
  const performSemanticSearch = React.useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setFilteredNotes(notes);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          includeContent: true,
          includeSummary: true 
        }),
      });
      
      if (res.ok) {
        const searchResults = await res.json();
        setFilteredNotes(searchResults.notes || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setFilteredNotes(notes); // Fallback to showing all notes
    } finally {
      setIsSearching(false);
    }
  }, [notes]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSemanticSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSemanticSearch]);

  // Create new note
  const saveNewNote = async (): Promise<void> => {
    if (!noteTitle || currentNoteContents.length === 0) return;
    try {
      // Convert draft text to final content with proper UUID
      const finalContents = currentNoteContents.map(content => 
        content.id === 'draft-text' 
          ? { ...content, id: crypto.randomUUID() }
          : content
      );
      
      const res = await fetch(`${API_BASE}/v1/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteTitle, contents: finalContents }),
      });
      if (res.ok) {
        const created: Note = await res.json();
        setNotes(prev => [created, ...prev]);
        setNewNoteOpen(false);
        setNoteTitle('');
        setCurrentNoteContents([]);
        setNewTextContent('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save edited note in detail view
  const saveEditedNote = async (): Promise<void> => {
    if (!selectedNote || !editingNoteTitle.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/v1/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editingNoteTitle,
          contents: selectedNote.contents 
        }),
      });
      
      if (res.ok) {
        const updated: Note = await res.json();
        setNotes(prev => prev.map(note => note.id === updated.id ? updated : note));
        setSelectedNote(updated);
        setIsEditingNote(false);
        setEditingNoteTitle('');
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  // Edit content item
  const startEditingContent = (contentId: string, currentText: string): void => {
    setEditingContentId(contentId);
    setEditingContentText(currentText);
  };

  // Save edited content
  const saveEditedContent = async (): Promise<void> => {
    if (!selectedNote || !editingContentId || !editingContentText.trim()) return;
    
    try {
      const updatedContents = selectedNote.contents.map(content =>
        content.id === editingContentId
          ? { ...content, content: editingContentText.trim(), timestamp: new Date().toISOString() }
          : content
      );

      const res = await fetch(`${API_BASE}/v1/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: selectedNote.title,
          contents: updatedContents 
        }),
      });
      
      if (res.ok) {
        const updated: Note = await res.json();
        setNotes(prev => prev.map(note => note.id === updated.id ? updated : note));
        setSelectedNote(updated);
        setEditingContentId(null);
        setEditingContentText('');
      }
    } catch (err) {
      console.error('Error updating content:', err);
    }
  };

  // Delete content item
  const deleteContent = async (contentId: string): Promise<void> => {
    if (!selectedNote || !window.confirm('Delete this content item?')) return;
    
    try {
      const updatedContents = selectedNote.contents.filter(content => content.id !== contentId);

      const res = await fetch(`${API_BASE}/v1/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: selectedNote.title,
          contents: updatedContents 
        }),
      });
      
      if (res.ok) {
        const updated: Note = await res.json();
        setNotes(prev => prev.map(note => note.id === updated.id ? updated : note));
        setSelectedNote(updated);
      }
    } catch (err) {
      console.error('Error deleting content:', err);
    }
  };

  // Delete note
  const deleteNote = async (id: string): Promise<void> => {
    if (!window.confirm('Delete this note?')) return;
    try {
      const res = await fetch(`${API_BASE}/v1/notes/${id}`, { method: 'DELETE' });
      if (res.ok) setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

    // Handle intelligent file upload with AI processing - adds to current note
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadingType(fileType);
    
    const data = new FormData();
    data.append('file', file);
    data.append('type', fileType);
    data.append('enableAI', 'true'); // Enable AI processing
    data.append('extractSummary', 'true');
    data.append('enableSemanticSearch', 'true');
    
    // If we're adding to an existing note, include the note ID
    if (noteDetailOpen && selectedNote) {
      data.append('noteId', selectedNote.id);
      data.append('addToExisting', 'true');
    } else if (newNoteOpen) {
      // If we're creating a new note, tell backend to process but not save as separate note
      data.append('processOnly', 'true');
    }
    
    try {
      const res = await fetch(`${API_BASE}/v1/ingest`, { 
        method: 'POST', 
        body: data 
      });
      
      if (res.ok) {
        const response = await res.json();
        console.log(`${fileType} upload successful:`, response);
        
        if (noteDetailOpen && selectedNote) {
          // Adding content to existing note - the backend should have already updated the note
          // Just refresh the note data
          try {
            const noteRes = await fetch(`${API_BASE}/v1/notes/${selectedNote.id}`);
            if (noteRes.ok) {
              const updatedNote: Note = await noteRes.json();
              setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
              setSelectedNote(updatedNote);
            }
          } catch (updateErr) {
            console.error('Error refreshing note after content addition:', updateErr);
          }
        } else if (newNoteOpen) {
          // Creating new note - add to current note contents
          // Use the processed content from the backend response
          const processedContent = response.content;
          if (processedContent) {
            setCurrentNoteContents(prev => [...prev, processedContent]);
          }
        } else {
          // If not in a note creation flow, refresh to see new notes
          await fetchNotes();
        }
      } else {
        const errorText = await res.text();
        console.error(`Failed to upload ${fileType}:`, errorText);
      }
    } catch (err) {
      console.error(`Failed to upload ${fileType}:`, err);
    } finally {
      setUploading(false);
      setUploadingType('');
      // Reset the file input to allow re-uploading the same file
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Get note type and icon based on contents
  const getNoteTypeInfo = (note: Note) => {
    const types = note.contents.map(c => c.type);
    
    // Multi-modal note
    if (types.length > 1) {
      return { icon: '📎', color: '#8b5cf6', label: 'Multi-modal' };
    }
    
    // Single type notes
    const icons = {
      audio: { icon: '🎤', color: '#10b981', label: 'Audio' },
      pdf: { icon: '📄', color: '#ef4444', label: 'PDF' },
      image: { icon: '🖼️', color: '#f59e0b', label: 'Image' },
      video: { icon: '🎥', color: '#8b5cf6', label: 'Video' },
      text: { icon: '📝', color: '#7c3aed', label: 'Text' }
    };
    
    return icons[types[0] as keyof typeof icons] || icons.text;
  };

  // Get note preview text from contents
  const getNotePreview = (note: Note): string => {
    const textContents = note.contents.filter(c => c.type === 'text');
    if (textContents.length > 0) {
      return textContents[0].content.slice(0, 150);
    }
    
    // Fallback to metadata
    const contentWithText = note.contents.find(c => c.metadata?.transcript || c.metadata?.extractedText);
    if (contentWithText) {
      const text = contentWithText.metadata?.transcript || contentWithText.metadata?.extractedText || '';
      return text.slice(0, 150);
    }
    
    // Show content types using Array.from to avoid Set iteration issue
    const typeSet = new Set(note.contents.map(c => c.type));
    const types = Array.from(typeSet);
    return `Contains: ${types.join(', ')} (${note.contents.length} items)`;
  };

  // Send chat message about specific note
  const sendNoteChatMessage = async (): Promise<void> => {
    if (!noteChatInput.trim() || !selectedNote) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: noteChatInput,
      timestamp: new Date().toISOString()
    };
    
    setNoteMessages(prev => [...prev, userMessage]);
    setNoteChatInput('');
    setNoteChatLoading(true);
    
    try {
      // Send message with note context
      const res = await fetch(`${API_BASE}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Regarding the note "${selectedNote.title}": ${noteChatInput}`,
          noteId: selectedNote.id 
        }),
      });
      
      if (res.ok) {
        const { answer }: { answer: string } = await res.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString()
        };
        setNoteMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      console.error('Note chat error:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setNoteMessages(prev => [...prev, errorMessage]);
    } finally {
      setNoteChatLoading(false);
    }
  };

  // Open note detail view
  const openNoteDetail = (note: Note): void => {
    setSelectedNote(note);
    setNoteDetailOpen(true);
    setNoteMessages([]); // Clear previous messages
    setChatOpen(false); // Close global chat if open
    setIsEditingNote(false); // Reset edit mode
    setEditingNoteTitle(''); // Reset edit title
    setEditingContentId(null); // Reset content editing
    setEditingContentText(''); // Reset content editing text
  };

  // Send chat message
  const sendChatMessage = async (): Promise<void> => {
    if (!chatInput.trim()) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput }),
      });
      
      if (res.ok) {
        const { answer }: { answer: string } = await res.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Send chat message
  // const sendMessage = async (): Promise<void> => {
  //   if (!input) return;
  //   const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
  //   setMessages(prev => [...prev, userMessage]);
  //   setInput('');
  //   try {
  //     const res = await fetch(`${API_BASE}/v1/chat`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ message: input }),
  //     });
  //     const { answer }: { answer: string } = await res.json();
  //     const assistantMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: answer };
  //     setMessages(prev => [...prev, assistantMessage]);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)',
      color: '#1e293b',
      position: 'relative'
    }}>
      {/* Enhanced Search Bar */}
      <Box sx={{ p: 3, pt: 4 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            variant="outlined"
            size="medium"
            placeholder="Search your notes..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: 3,
                '& fieldset': {
                  border: '1px solid #e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: '#7c3aed',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#7c3aed',
                },
              },
              '& .MuiInputBase-input': {
                color: '#1e293b',
                fontSize: '1rem',
                py: 1.5,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AIIcon sx={{ color: '#7c3aed', mr: 1 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => performSemanticSearch(searchQuery)}
                    disabled={isSearching}
                    sx={{ 
                      backgroundColor: '#7c3aed', 
                      color: 'white', 
                      borderRadius: 2, 
                      '&:hover': { backgroundColor: '#6d28d9' },
                      '&:disabled': { backgroundColor: '#cbd5e1' }
                    }}
                  >
                    {isSearching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* Notes Grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: 3,
        px: 3,
        pb: 10
      }}>
        {filteredNotes.map(note => {
          const typeInfo = getNoteTypeInfo(note);
          return (
            <Box
              key={note.id}
              onClick={() => openNoteDetail(note)}
              sx={{
                backgroundColor: 'white',
                color: '#1e293b',
                borderRadius: 4,
                p: 3,
                cursor: 'pointer',
                position: 'relative',
                border: '1px solid #e2e8f0',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(124, 58, 237, 0.15)',
                  borderColor: '#7c3aed',
                  transition: 'all 0.2s ease'
                }
              }}
            >
              {/* Note Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: typeInfo.color, 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography sx={{ fontSize: '12px', color: 'white' }}>
                      {typeInfo.icon}
                    </Typography>
                  </Box>
                  <Chip 
                    label={typeInfo.label} 
                    size="small" 
                    sx={{ 
                      backgroundColor: `${typeInfo.color}20`, 
                      color: typeInfo.color, 
                      fontSize: '0.7rem',
                      height: 20
                    }} 
                  />
                </Box>
                
                {/* Processing Status */}
                {uploading && uploadingType && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Processing...
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Note Content */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                {note.title}
              </Typography>
              
              {/* AI Summary (if available) */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1, lineHeight: 1.5 }}>
                  {getNotePreview(note) + (getNotePreview(note).length > 150 ? '...' : '')}
                </Typography>
                
                {/* Show contents count and types */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {note.contents.map((content, index) => (
                    <Chip
                      key={content.id}
                      label={`${content.type}${content.metadata?.originalFilename ? ` - ${content.metadata.originalFilename}` : ''}`}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 20,
                        backgroundColor: `${typeInfo.color}15`,
                        color: typeInfo.color,
                      }}
                    />
                  ))}
                </Box>
                
                {/* Show AI-generated summary if available */}
                {note.contents.some(c => c.metadata?.summary) && (
                  <Accordion sx={{ mt: 1, boxShadow: 'none', '&:before': { display: 'none' } }}>
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ 
                        p: 0, 
                        minHeight: 'auto',
                        '& .MuiAccordionSummary-content': { m: 0 }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AIIcon sx={{ color: '#7c3aed', fontSize: 16 }} />
                        <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 500 }}>
                          AI Insights
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, pt: 1 }}>
                      {note.contents.filter(c => c.metadata?.summary).map(content => (
                        <Typography key={content.id} variant="caption" sx={{ 
                          color: '#475569', 
                          fontStyle: 'italic',
                          backgroundColor: '#f8fafc',
                          p: 1,
                          borderRadius: 1,
                          display: 'block',
                          mb: 1
                        }}>
                          <strong>{content.type}:</strong> {content.metadata?.summary}
                        </Typography>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
              
              {/* Note Metadata */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 14, color: '#64748b' }} />
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                
                {/* Participants (for meeting notes) */}
                {typeInfo.label === 'Audio' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14, color: '#64748b' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                      Meeting
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Delete Action */}
              <Box sx={{ 
                position: 'absolute',
                top: 12,
                right: 12,
                opacity: 0,
                transition: 'opacity 0.2s ease',
                '.MuiBox-root:hover &': {
                  opacity: 1
                }
              }}>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  sx={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.2)' }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>



      {/* Chat Interface */}
      {chatOpen && (
        <Box sx={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 400,
          height: 600,
          backgroundColor: 'white',
          borderRadius: 4,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <Box sx={{
            p: 3,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#7c3aed',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Chat
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setChatOpen(false)}
              sx={{ color: 'white', p: 0.5 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Chat Messages */}
          <Box sx={{
            flex: 1,
            p: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            backgroundColor: '#f8fafc'
          }}>
            {messages.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <AIIcon sx={{ fontSize: 48, mb: 2, color: '#7c3aed' }} />
                <Typography variant="h6" sx={{ mb: 1, color: '#1e293b' }}>
                  Ask me about your notes!
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  I can help you find information, summarize content, and answer questions about your notes.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Try asking:
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    • "What were the key decisions from yesterday's meeting?"
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    • "Show me all audio recordings about project planning"
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    • "Summarize the action items from this week"
                  </Typography>
                </Box>
              </Box>
            ) : (
              messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: message.role === 'user' ? '#7c3aed' : 'white',
                      color: message.role === 'user' ? 'white' : '#1e293b',
                      border: message.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                      {message.content}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7, 
                        fontSize: '0.65rem',
                        display: 'block',
                        mt: 0.5
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
            
            {/* Loading indicator */}
            {chatLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                <Box sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <CircularProgress size={16} sx={{ color: '#7c3aed' }} />
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    AI is thinking...
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Chat Input */}
          <Box sx={{
            p: 2,
            borderTop: '1px solid #e2e8f0',
            backgroundColor: 'white'
          }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask about your notes..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                disabled={chatLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#7c3aed',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#7c3aed',
                    },
                  }
                }}
              />
              <IconButton
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || chatLoading}
                sx={{
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: '#6d28d9' },
                  '&:disabled': { backgroundColor: '#cbd5e1', color: '#94a3b8' }
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* Add Button and Chat Button */}
      <Box sx={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        zIndex: 1000
      }}>
        {/* Chat Button */}
        <IconButton
          onClick={() => setChatOpen(!chatOpen)}
          sx={{
            backgroundColor: chatOpen ? '#ef4444' : '#10b981',
            color: 'white',
            width: 56,
            height: 56,
            '&:hover': { 
              backgroundColor: chatOpen ? '#dc2626' : '#059669',
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          {chatOpen ? <CloseIcon sx={{ fontSize: 28 }} /> : <ChatIcon sx={{ fontSize: 28 }} />}
        </IconButton>

        {/* Add Note Button */}
        {!chatOpen && (
          <IconButton
            onClick={() => setNewNoteOpen(true)}
            disabled={uploading}
            sx={{
              backgroundColor: uploading ? '#cbd5e1' : '#7c3aed',
              color: 'white',
              width: 56,
              height: 56,
              '&:hover': { 
                backgroundColor: uploading ? '#cbd5e1' : '#6d28d9',
                transform: uploading ? 'none' : 'scale(1.05)'
              },
              '&:disabled': { backgroundColor: '#cbd5e1' },
              transition: 'all 0.2s ease'
            }}
          >
            {uploading ? <CircularProgress size={28} color="inherit" /> : <AddIcon sx={{ fontSize: 28 }} />}
          </IconButton>
        )}
      </Box>

      {/* Note Detail Dialog */}
      <Dialog 
        open={noteDetailOpen} 
        onClose={() => setNoteDetailOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxHeight: '800px' }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#7c3aed', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {selectedNote && (() => {
              const typeInfo = getNoteTypeInfo(selectedNote);
              return (
                <>
                  <Box sx={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography sx={{ fontSize: '12px', color: 'white' }}>
                      {typeInfo.icon}
                    </Typography>
                  </Box>
                  {isEditingNote ? (
                    <TextField
                      value={editingNoteTitle}
                      onChange={(e) => setEditingNoteTitle(e.target.value)}
                      variant="standard"
                      sx={{
                        flex: 1,
                        '& .MuiInput-root': {
                          color: 'white',
                          fontSize: '1.25rem',
                          fontWeight: 600,
                        },
                        '& .MuiInput-underline:before': {
                          borderBottomColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '& .MuiInput-underline:hover:before': {
                          borderBottomColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '& .MuiInput-underline:after': {
                          borderBottomColor: 'white',
                        },
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          saveEditedNote();
                        }
                        if (e.key === 'Escape') {
                          setIsEditingNote(false);
                          setEditingNoteTitle('');
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                      {selectedNote.title}
                    </Typography>
                  )}
                </>
              );
            })()}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isEditingNote ? (
              <>
                <IconButton 
                  onClick={saveEditedNote}
                  disabled={!editingNoteTitle.trim()}
                  sx={{ 
                    color: 'white', 
                    p: 0.5,
                    '&:disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                  }}
                >
                  <CheckIcon />
                </IconButton>
                <IconButton 
                  onClick={() => {
                    setIsEditingNote(false);
                    setEditingNoteTitle('');
                  }}
                  sx={{ color: 'white', p: 0.5 }}
                >
                  <CloseIcon />
                </IconButton>
              </>
            ) : (
              <IconButton 
                onClick={() => {
                  setIsEditingNote(true);
                  setEditingNoteTitle(selectedNote?.title || '');
                }}
                sx={{ color: 'white', p: 0.5 }}
              >
                <EditIcon />
              </IconButton>
            )}
            
            <IconButton 
              onClick={() => setNoteDetailOpen(false)}
              sx={{ color: 'white', p: 0.5 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: 'flex', height: '100%' }}>
          {/* Note Content Panel */}
          <Box sx={{ 
            flex: 1, 
            p: 3, 
            overflowY: 'auto',
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
          }}>
            {selectedNote && (
              <>
                {/* Note Metadata */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                    Created: {new Date(selectedNote.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}
                  </Typography>
                </Box>

                {/* Note Contents */}
                <Typography variant="h6" sx={{ mb: 2, color: '#1e293b' }}>
                  Contents ({selectedNote.contents.length} items)
                </Typography>

                {/* Add More Content Section */}
                <Accordion sx={{ mb: 3, boxShadow: 'none', border: '1px solid #7c3aed', borderRadius: 2 }}>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      backgroundColor: 'rgba(124, 58, 237, 0.05)',
                      '&:hover': { backgroundColor: 'rgba(124, 58, 237, 0.1)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddIcon sx={{ color: '#7c3aed' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                        Add More Content
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ backgroundColor: 'white' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
                      <Button 
                        component="label" 
                        startIcon={<MicIcon />} 
                        variant="outlined"
                        disabled={uploading && uploadingType === 'audio'}
                        sx={{ 
                          p: 1.5, 
                          borderColor: '#10b981', 
                          color: '#10b981',
                          fontSize: '0.8rem',
                          '&:hover': { backgroundColor: '#f0fdf4', borderColor: '#059669' },
                          '&:disabled': { backgroundColor: '#f3f4f6' }
                        }}
                      >
                        {uploading && uploadingType === 'audio' ? 'Processing...' : 'Audio'}
                        <input 
                          type="file" 
                          accept="audio/*,.mp3,.wav,.m4a,.aac" 
                          hidden 
                          onChange={(e) => handleFileUpload(e, 'audio')} 
                          disabled={uploading} 
                        />
                      </Button>
                      
                      <Button 
                        component="label" 
                        startIcon={<ImageIcon />} 
                        variant="outlined"
                        disabled={uploading && uploadingType === 'image'}
                        sx={{ 
                          p: 1.5, 
                          borderColor: '#f59e0b', 
                          color: '#f59e0b',
                          fontSize: '0.8rem',
                          '&:hover': { backgroundColor: '#fffbeb', borderColor: '#d97706' },
                          '&:disabled': { backgroundColor: '#f3f4f6' }
                        }}
                      >
                        {uploading && uploadingType === 'image' ? 'Processing...' : 'Image'}
                        <input 
                          type="file" 
                          accept="image/*,.jpg,.jpeg,.png,.gif,.webp" 
                          hidden 
                          onChange={(e) => handleFileUpload(e, 'image')} 
                          disabled={uploading} 
                        />
                      </Button>
                      
                      <Button 
                        component="label" 
                        startIcon={<PdfIcon />} 
                        variant="outlined"
                        disabled={uploading && uploadingType === 'pdf'}
                        sx={{ 
                          p: 1.5, 
                          borderColor: '#ef4444', 
                          color: '#ef4444',
                          fontSize: '0.8rem',
                          '&:hover': { backgroundColor: '#fef2f2', borderColor: '#dc2626' },
                          '&:disabled': { backgroundColor: '#f3f4f6' }
                        }}
                      >
                        {uploading && uploadingType === 'pdf' ? 'Processing...' : 'PDF'}
                        <input 
                          type="file" 
                          accept=".pdf,application/pdf" 
                          hidden 
                          onChange={(e) => handleFileUpload(e, 'pdf')} 
                          disabled={uploading} 
                        />
                      </Button>
                      
                      <Button 
                        component="label" 
                        startIcon={<VideoIcon />} 
                        variant="outlined"
                        disabled={uploading && uploadingType === 'video'}
                        sx={{ 
                          p: 1.5, 
                          borderColor: '#8b5cf6', 
                          color: '#8b5cf6',
                          fontSize: '0.8rem',
                          '&:hover': { backgroundColor: '#faf5ff', borderColor: '#7c3aed' },
                          '&:disabled': { backgroundColor: '#f3f4f6' }
                        }}
                      >
                        {uploading && uploadingType === 'video' ? 'Processing...' : 'Video'}
                        <input 
                          type="file" 
                          accept="video/*,.mp4,.mov,.avi,.mkv" 
                          hidden 
                          onChange={(e) => handleFileUpload(e, 'video')} 
                          disabled={uploading} 
                        />
                      </Button>
                    </Box>

                    {/* Add Text Content */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: '#7c3aed', fontWeight: 600 }}>
                        Add Text Note
                      </Typography>
                      <TextField
                        placeholder="Write additional notes or thoughts..."
                        multiline
                        rows={3}
                        fullWidth
                        variant="outlined"
                        value={newTextContent}
                        onChange={(e) => setNewTextContent(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '0.875rem',
                            '& fieldset': {
                              borderColor: '#e2e8f0',
                            },
                            '&:hover fieldset': {
                              borderColor: '#7c3aed',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#7c3aed',
                            },
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!newTextContent.trim()}
                          onClick={async () => {
                            if (!selectedNote || !newTextContent.trim()) return;
                            
                            try {
                              const newContent: MediaContent = {
                                id: crypto.randomUUID(),
                                type: 'text',
                                content: newTextContent.trim(),
                                timestamp: new Date().toISOString()
                              };

                              const updatedContents = [...selectedNote.contents, newContent];

                              const res = await fetch(`${API_BASE}/v1/notes/${selectedNote.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  title: selectedNote.title,
                                  contents: updatedContents 
                                }),
                              });
                              
                              if (res.ok) {
                                const updated: Note = await res.json();
                                setNotes(prev => prev.map(note => note.id === updated.id ? updated : note));
                                setSelectedNote(updated);
                                setNewTextContent('');
                              }
                            } catch (err) {
                              console.error('Error adding text content:', err);
                            }
                          }}
                          sx={{ 
                            backgroundColor: '#7c3aed',
                            '&:hover': { backgroundColor: '#6d28d9' },
                            '&:disabled': { backgroundColor: '#cbd5e1' }
                          }}
                        >
                          Add Text
                        </Button>
                      </Box>
                    </Box>

                    {/* Upload Status */}
                    {uploading && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        mt: 2, 
                        p: 2, 
                        backgroundColor: '#f0f9ff', 
                        borderRadius: 2,
                        border: '1px solid #bae6fd'
                      }}>
                        <CircularProgress size={20} sx={{ color: '#0ea5e9' }} />
                        <Typography variant="body2" sx={{ color: '#0369a1' }}>
                          Processing {uploadingType} content with AI...
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedNote.contents.map((content, index) => (
                    <Box
                      key={content.id}
                      sx={{
                        backgroundColor: 'white',
                        borderRadius: 2,
                        p: 2,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      {/* Content Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {content.type === 'text' && <TextIcon sx={{ fontSize: 16, color: '#7c3aed' }} />}
                        {content.type === 'audio' && <MicIcon sx={{ fontSize: 16, color: '#10b981' }} />}
                        {content.type === 'image' && <ImageIcon sx={{ fontSize: 16, color: '#f59e0b' }} />}
                        {content.type === 'pdf' && <PdfIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
                        {content.type === 'video' && <VideoIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />}
                        
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {content.type} Content
                        </Typography>
                        
                        <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
                          {new Date(content.timestamp).toLocaleString()}
                        </Typography>

                        {/* Content Actions */}
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                          {content.type === 'text' && (
                            <IconButton 
                              size="small"
                              onClick={() => startEditingContent(content.id, content.content)}
                              sx={{ 
                                color: '#7c3aed',
                                '&:hover': { backgroundColor: 'rgba(124, 58, 237, 0.1)' }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton 
                            size="small"
                            onClick={() => deleteContent(content.id)}
                            sx={{ 
                              color: '#ef4444',
                              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Content Body */}
                      {content.type === 'text' && (
                        <>
                          {editingContentId === content.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <TextField
                                value={editingContentText}
                                onChange={(e) => setEditingContentText(e.target.value)}
                                multiline
                                rows={4}
                                fullWidth
                                variant="outlined"
                                placeholder="Edit your text content..."
                                helperText="Press Ctrl+Enter to save quickly"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem',
                                    '& fieldset': {
                                      borderColor: '#7c3aed',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#7c3aed',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#7c3aed',
                                    },
                                  },
                                  '& .MuiFormHelperText-root': {
                                    color: '#64748b',
                                    fontSize: '0.75rem'
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    saveEditedContent();
                                  }
                                }}
                                autoFocus
                              />
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setEditingContentId(null);
                                    setEditingContentText('');
                                  }}
                                  sx={{ color: '#64748b' }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={saveEditedContent}
                                  disabled={!editingContentText.trim()}
                                  sx={{ 
                                    backgroundColor: '#7c3aed',
                                    '&:hover': { backgroundColor: '#6d28d9' },
                                    '&:disabled': { backgroundColor: '#cbd5e1' }
                                  }}
                                >
                                  Save
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.6 }}>
                              {content.content}
                            </Typography>
                          )}
                        </>
                      )}

                      {/* File Content */}
                      {content.type !== 'text' && (
                        <>
                          {content.metadata?.originalFilename && (
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                              📎 {content.metadata.originalFilename}
                            </Typography>
                          )}
                          
                          {/* AI-generated content */}
                          {content.metadata?.transcript && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                                🎤 Transcript:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#1e293b', 
                                backgroundColor: '#f1f5f9', 
                                p: 1, 
                                borderRadius: 1, 
                                mt: 0.5,
                                lineHeight: 1.5
                              }}>
                                {content.metadata.transcript}
                              </Typography>
                            </Box>
                          )}
                          
                          {content.metadata?.extractedText && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                                📄 Extracted Text:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#1e293b', 
                                backgroundColor: '#f1f5f9', 
                                p: 1, 
                                borderRadius: 1, 
                                mt: 0.5,
                                lineHeight: 1.5
                              }}>
                                {content.metadata.extractedText}
                              </Typography>
                            </Box>
                          )}
                          
                          {content.metadata?.summary && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                                🤖 AI Summary:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#1e293b', 
                                backgroundColor: '#fef3c7', 
                                p: 1, 
                                borderRadius: 1, 
                                mt: 0.5,
                                fontStyle: 'italic',
                                lineHeight: 1.5
                              }}>
                                {content.metadata.summary}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>

          {/* Chat Panel */}
          <Box sx={{ 
            width: 400, 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: 'white'
          }}>
            {/* Chat Header */}
            <Box sx={{
              p: 2,
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon sx={{ color: '#7c3aed' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Ask about this note
                </Typography>
              </Box>
            </Box>

            {/* Chat Messages */}
            <Box sx={{
              flex: 1,
              p: 2,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              backgroundColor: '#f8fafc'
            }}>
              {noteMessages.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  textAlign: 'center',
                  color: '#64748b'
                }}>
                  <AIIcon sx={{ fontSize: 32, mb: 1, color: '#7c3aed' }} />
                  <Typography variant="body2" sx={{ mb: 1, color: '#1e293b', fontWeight: 500 }}>
                    Ask me about this note!
                  </Typography>
                  <Typography variant="caption" sx={{ mb: 1 }}>
                    Try asking:
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic', mb: 0.5 }}>
                    • "What are the key points?"
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic', mb: 0.5 }}>
                    • "Summarize the action items"
                  </Typography>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    • "Who were the participants?"
                  </Typography>
                </Box>
              ) : (
                noteMessages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '85%',
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: message.role === 'user' ? '#7c3aed' : 'white',
                        color: message.role === 'user' ? 'white' : '#1e293b',
                        border: message.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                        {message.content}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          opacity: 0.7, 
                          fontSize: '0.6rem',
                          display: 'block',
                          mt: 0.3
                        }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
              
              {/* Loading indicator */}
              {noteChatLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                  <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <CircularProgress size={12} sx={{ color: '#7c3aed' }} />
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      AI is thinking...
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Chat Input */}
            <Box sx={{
              p: 2,
              borderTop: '1px solid #e2e8f0',
              backgroundColor: 'white'
            }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ask about this note..."
                  value={noteChatInput}
                  onChange={(e) => setNoteChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendNoteChatMessage();
                    }
                  }}
                  disabled={noteChatLoading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.9rem',
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#7c3aed',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#7c3aed',
                      },
                    }
                  }}
                />
                <IconButton
                  onClick={sendNoteChatMessage}
                  disabled={!noteChatInput.trim() || noteChatLoading}
                  sx={{
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    borderRadius: 2,
                    width: 36,
                    height: 36,
                    '&:hover': { backgroundColor: '#6d28d9' },
                    '&:disabled': { backgroundColor: '#cbd5e1', color: '#94a3b8' }
                  }}
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* New Note Dialog */}
      <Dialog open={newNoteOpen} onClose={() => setNewNoteOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#7c3aed', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1, 
        }}>
          <AddIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Create Multi-Modal Note
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 5 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Note Title"
            type="text"
            fullWidth
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
            sx={{ mb: 3 }}
            placeholder="Enter a descriptive title for your note..."
          />
          
          {/* Content Sections */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
              Add Content
            </Typography>
            
            {/* Text Content Section */}
            <Accordion defaultExpanded sx={{ mb: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextIcon sx={{ color: '#7c3aed' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    Text Content
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  label="Write your notes, thoughts, or any text content..."
                  type="text"
                  multiline
                  rows={4}
                  fullWidth
                  value={newTextContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewTextContent(value);
                    
                    // Auto-add text content to note as user types
                    if (value.trim()) {
                      // Check if we already have a text content item, update it instead of creating new
                      const existingTextIndex = currentNoteContents.findIndex(c => c.type === 'text' && c.id === 'draft-text');
                      
                      if (existingTextIndex >= 0) {
                        // Update existing draft text
                        setCurrentNoteContents(prev => prev.map((content, index) => 
                          index === existingTextIndex 
                            ? { ...content, content: value, timestamp: new Date().toISOString() }
                            : content
                        ));
                      } else {
                        // Create new draft text content
                        const newContent: MediaContent = {
                          id: 'draft-text',
                          type: 'text',
                          content: value,
                          timestamp: new Date().toISOString()
                        };
                        setCurrentNoteContents(prev => [...prev, newContent]);
                      }
                    } else {
                      // Remove text content if empty
                      setCurrentNoteContents(prev => prev.filter(c => c.id !== 'draft-text'));
                    }
                  }}
                  placeholder="Start typing your notes here..."
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#e2e8f0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#7c3aed',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#7c3aed',
                      },
                    }
                  }}
                />
              </AccordionDetails>
            </Accordion>

            {/* Media Content Section */}
            <Accordion sx={{ mb: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  Media & Files
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Button 
                    component="label" 
                    startIcon={<MicIcon />} 
                    variant="outlined"
                    disabled={uploading && uploadingType === 'audio'}
                    sx={{ 
                      p: 2, 
                      borderColor: '#10b981', 
                      color: '#10b981',
                      '&:hover': { backgroundColor: '#f0fdf4', borderColor: '#059669' },
                      '&:disabled': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    {uploading && uploadingType === 'audio' ? 'Processing...' : 'Audio Recording'}
                    <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac" hidden onChange={(e) => handleFileUpload(e, 'audio')} disabled={uploading} />
                  </Button>
                  
                  <Button 
                    component="label" 
                    startIcon={<ImageIcon />} 
                    variant="outlined"
                    disabled={uploading && uploadingType === 'image'}
                    sx={{ 
                      p: 2, 
                      borderColor: '#f59e0b', 
                      color: '#f59e0b',
                      '&:hover': { backgroundColor: '#fffbeb', borderColor: '#d97706' },
                      '&:disabled': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    {uploading && uploadingType === 'image' ? 'Processing...' : 'Whiteboard/Photo'}
                    <input type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.webp" hidden onChange={(e) => handleFileUpload(e, 'image')} disabled={uploading} />
                  </Button>
                  
                  <Button 
                    component="label" 
                    startIcon={<PdfIcon />} 
                    variant="outlined"
                    disabled={uploading && uploadingType === 'pdf'}
                    sx={{ 
                      p: 2, 
                      borderColor: '#ef4444', 
                      color: '#ef4444',
                      '&:hover': { backgroundColor: '#fef2f2', borderColor: '#dc2626' },
                      '&:disabled': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    {uploading && uploadingType === 'pdf' ? 'Processing...' : 'PDF Document'}
                    <input type="file" accept=".pdf,application/pdf" hidden onChange={(e) => handleFileUpload(e, 'pdf')} disabled={uploading} />
                  </Button>
                  
                  <Button 
                    component="label" 
                    startIcon={<VideoIcon />} 
                    variant="outlined"
                    disabled={uploading && uploadingType === 'video'}
                    sx={{ 
                      p: 2, 
                      borderColor: '#8b5cf6', 
                      color: '#8b5cf6',
                      '&:hover': { backgroundColor: '#faf5ff', borderColor: '#7c3aed' },
                      '&:disabled': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    {uploading && uploadingType === 'video' ? 'Processing...' : 'Video Recording'}
                    <input type="file" accept="video/*,.mp4,.mov,.avi,.mkv" hidden onChange={(e) => handleFileUpload(e, 'video')} disabled={uploading} />
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* Current Contents Preview */}
          {currentNoteContents.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                Note Contents ({currentNoteContents.length} items)
              </Typography>
              <List dense sx={{ backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                {currentNoteContents.map((content, index) => (
                  <ListItem key={content.id} sx={{ px: 2, py: 1.5, borderBottom: index < currentNoteContents.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {content.type === 'text' && <TextIcon sx={{ fontSize: 20, color: '#7c3aed' }} />}
                      {content.type === 'audio' && <MicIcon sx={{ fontSize: 20, color: '#10b981' }} />}
                      {content.type === 'image' && <ImageIcon sx={{ fontSize: 20, color: '#f59e0b' }} />}
                      {content.type === 'pdf' && <PdfIcon sx={{ fontSize: 20, color: '#ef4444' }} />}
                      {content.type === 'video' && <VideoIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        content.type === 'text' 
                          ? content.content.slice(0, 80) + (content.content.length > 80 ? '...' : '')
                          : content.metadata?.originalFilename || `${content.type} content`
                      }
                      secondary={`${content.type.charAt(0).toUpperCase() + content.type.slice(1)} • ${new Date(content.timestamp).toLocaleTimeString()}`}
                      primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.8rem', color: '#64748b' }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => setCurrentNoteContents(prev => prev.filter(c => c.id !== content.id))}
                      sx={{ 
                        color: '#ef4444',
                        '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {uploading && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              mt: 2, 
              p: 2, 
              backgroundColor: '#f0f9ff', 
              borderRadius: 2,
              border: '1px solid #bae6fd'
            }}>
              <CircularProgress size={24} sx={{ color: '#0ea5e9' }} />
              <Typography variant="body2" sx={{ color: '#0369a1' }}>
                Processing {uploadingType} content with AI...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc' }}>
          <Button 
            onClick={() => {
              setNewNoteOpen(false);
              setNoteTitle('');
              setCurrentNoteContents([]);
              setNewTextContent('');
            }}
            sx={{ color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={saveNewNote} 
            variant="contained" 
            disabled={!noteTitle.trim() || currentNoteContents.length === 0 || uploading}
            sx={{ 
              backgroundColor: '#7c3aed',
              '&:hover': { backgroundColor: '#6d28d9' },
              '&:disabled': { backgroundColor: '#cbd5e1' }
            }}
          >
            Create Note
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotesApp;
