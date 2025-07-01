import React, { useState, useEffect, useRef } from 'react';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { 
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  useTheme,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  UploadFile as UploadIcon,
  Chat as BotIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export default function App() {
  const theme = useTheme();
  const [notes, setNotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const endRef = useRef(null);

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to load notes', err);
    }
  };

  // Scroll chat
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create new note
  const openNewDialog = () => {
    setNoteTitle('');
    setNoteContent('');
    setNewNoteOpen(true);
  };

  const saveNewNote = async () => {
    if (!noteTitle || !noteContent) return;
    try {
      const res = await fetch(`${API_BASE}/v1/ingest-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteTitle, content: noteContent }),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes(prev => [created, ...prev]);
        setNewNoteOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open edit modal
  const openEditDialog = note => {
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setEditId(note.id);
    setEditNoteOpen(true);
  };

  // Save edited note
  const saveEditNote = async () => {
    if (!noteTitle || !noteContent || !editId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/notes/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteTitle, content: noteContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
        setEditNoteOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete note
  const deleteNote = async id => {
    if (!window.confirm('Delete this note?')) return;
    try {
      const res = await fetch(`${API_BASE}/v1/notes/${id}`, { method: 'DELETE' });
      if (res.ok) setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Handle file upload
  const handleUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      await fetch(`${API_BASE}/v1/ingest`, { method: 'POST', body: data });
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!input) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: input }]);
    setInput('');
    try {
      const res = await fetch(`${API_BASE}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const { answer } = await res.json();
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: answer }]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box display="flex" flexDirection="column" height="100vh">
      {/* Branding Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }} color="#7367f0">
            Fink AI
          </Typography>
        </Toolbar>
      </AppBar>
    {/* Main Content */}
    <Box height="calc(100% - 64px)" display="flex">
      {/* Left panel */}
      <Box width={400} borderRight={`1px solid ${theme.palette.divider}`} display="flex" flexDirection="column">
        {/* Header: New & Upload */}
        <Box p={2}>
          <Typography variant="h6" gutterBottom>Conversations</Typography>
          <Box display="flex" gap={1} mb={1}>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNewDialog} fullWidth>
              New Note
            </Button>
            <Button variant="outlined" size="small" startIcon={<UploadIcon />} component="label" fullWidth>
              Upload
              <input type="file" accept="audio/*" hidden onChange={handleUpload} />
            </Button>
          </Box>
          {/* Search */}
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search..."
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Divider />
        {/* List of notes with edit/delete */}
        <Box flex={1} overflow="auto">
          <List>
            {notes.map(note => (
              <ListItem key={note.id} disablePadding secondaryAction={
                  <>
                    <IconButton edge="end" onClick={() => openEditDialog(note)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" onClick={() => deleteNote(note.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                }>
                <ListItemButton onClick={() => {/* optionally select conversation */}}>
                  <ListItemIcon>
                    <BotIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={note.title}
                    secondary={
                      note.content.slice(0, 50) + (note.content.length > 50 ? '…' : '')
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>

      {/* Right panel */}
      <Box flex={1} display="flex" flexDirection="column">
        <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>        
          <Typography variant="h6">Chat with your notes</Typography>
          <Typography variant="body2" color="text.secondary">
            Ask questions about your notes and get answers
          </Typography>
        </Box>
        <Box flex={1} p={2} overflow="auto" display="flex" flexDirection="column" gap={2}>
          {messages.length === 0 ? (
            <Box display="flex" alignItems="flex-start" gap={1} p={2} bgcolor={theme.palette.grey[100]} borderRadius={2}>
              <BotIcon color="action" />
              <Box>
                <Typography variant="body1">
                  Hi there! I can help you retrieve information from your notes. Just ask me a question.
                </Typography>
                {/* <Typography variant="caption" color="text.secondary">
                  {new Date().toLocaleTimeString()}
                </Typography> */}
              </Box>
            </Box>
          ) : (
            messages.map(msg => (
              <Box
                key={msg.id}
                display="flex"
                alignItems="flex-end"
                justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                gap={1}
              >
                {msg.role === 'assistant' && <BotIcon color="action" />}
                <Box
                  p={1.5}
                  bgcolor={msg.role === 'user' ? theme.palette.primary.main : theme.palette.grey[100]}
                  color={msg.role === 'user' ? 'white' : theme.palette.text.primary}
                  borderRadius={2}
                  maxWidth="75%"
                >
                  <Typography variant="body1">{msg.content}</Typography>
                  {/* <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleTimeString()}
                  </Typography> */}
                </Box>
              </Box>
            ))
          )}
          <div ref={endRef} />
        </Box>

        <Box p={2} borderTop={`1px solid ${theme.palette.divider}`} display="flex" gap={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask something about your notes..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <Button variant="contained" onClick={sendMessage} startIcon={<SendIcon />}>Send</Button>
        </Box>
      </Box>

      {/* New Note Dialog */}
      <Dialog open={newNoteOpen} onClose={() => setNewNoteOpen(false)}>
        <DialogTitle>New Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            type="text"
            fullWidth
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Content"
            type="text"
            multiline
            rows={4}
            fullWidth
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewNoteOpen(false)}>Cancel</Button>
          <Button onClick={saveNewNote} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={editNoteOpen} onClose={() => setEditNoteOpen(false)}>
        <DialogTitle>Edit Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            type="text"
            fullWidth
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Content"
            type="text"
            multiline
            rows={4}
            fullWidth
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNoteOpen(false)}>Cancel</Button>
          <Button onClick={saveEditNote} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  );
}
