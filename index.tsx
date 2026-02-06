import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// PENTING: Import CSS Global/Tailwind lo di sini supaya ke-load sama Vite
import 'index.css'; 

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Biar keren, kita log ke console dengan style Akasha
  console.error("%c[Akasha System] Critical Error: Root element not found.", "color: #ff4d4d; font-weight: bold;");
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* App utama lo sekarang udah dapet semua context dari 
        index.html (font & stars) dan index.css (Tailwind)
      */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
