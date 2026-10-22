import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { captureInvite, registerServiceWorker } from './pwa';
import './styles.css';
import './characters/characters.css';

captureInvite(); // before anything reads the URL
registerServiceWorker();
createRoot(document.getElementById('root')).render(<App />);
