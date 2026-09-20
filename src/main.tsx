import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isSupabaseConfigured } from './lib/supabase.ts';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (!isSupabaseConfigured) {
  root.render(
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f8fafc',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '580px',
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #fecaca',
          borderRadius: '1rem',
          padding: '2.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '1.75rem',
            marginBottom: '1.25rem',
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#991b1b',
            marginBottom: '0.75rem',
          }}
        >
          Configuration Required
        </h1>
        <p
          style={{
            fontSize: '1rem',
            lineHeight: '1.6',
            color: '#334155',
            margin: '0 auto',
          }}
        >
          Supabase is not configured. Set <strong>VITE_SUPABASE_URL</strong> and{' '}
          <strong>VITE_SUPABASE_ANON_KEY</strong> in Vercel → Project → Settings → Environment
          Variables, then redeploy.
        </p>
      </div>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
