import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a modern theme aligned with Fink AI
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7367f0' },
    secondary: { main: '#f472b6' },
    background: { default: '#f9fafb', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280' },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.875rem' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: '#fff', boxShadow: 'none' } },
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
createRoot(container).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);