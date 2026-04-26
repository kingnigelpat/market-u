import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    document.body.innerHTML = `
    <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
      <h1 style="color: #ef4444;">Configuration Missing</h1>
      <p>Please add your Environment Variables (Firebase/Cloudinary) to the Vercel project settings and redeploy.</p>
    </div>
  `;
} else {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
