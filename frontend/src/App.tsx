import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import NotesApp from './NotesApp';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/notes" element={<NotesApp />} />
      </Routes>
    </Router>
  );
};

export default App;