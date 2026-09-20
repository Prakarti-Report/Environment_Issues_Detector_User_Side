# EarthForward — Citizen Reporting App

EarthForward is a citizen reporting web application for detecting and tracking environmental pollution hazards. The application integrates Supabase for live reporting data, user authentication, and storage, alongside an AI detection service to analyze reported incidents.

## Run locally vs deployed

The application automatically detects whether it is running on a local host (`localhost`, `127.0.0.1`, LAN IP) or deployed on the web (e.g., Vercel) and routes AI requests accordingly without requiring manual code edits.

| | Local | Online |
|---|---|---|
| Frontend | `http://localhost:5173` | Vercel URL |
| AI API | `http://localhost:8000/detect-pollution` | Render URL |
| Database/Storage | same Supabase project | same Supabase project |

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional AI API overrides (leave blank for automatic defaults):
```env
VITE_AI_API_URL_LOCAL=http://localhost:8000/detect-pollution
VITE_AI_API_URL_PROD=https://pollution-detection.onrender.com/detect-pollution
VITE_AI_FALLBACK_TO_PROD=false
```

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Build & Preview

```bash
npm run build
npm run preview
```
