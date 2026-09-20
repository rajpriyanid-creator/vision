import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisionProvider } from './context/VisionContext';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <VisionProvider>
        <App />
      </VisionProvider>
    </React.StrictMode>
  );
}
