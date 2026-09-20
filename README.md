# PRAKARTI REPORT — Citizen Reporting App

PRAKARTI REPORT is a citizen reporting web application for detecting and tracking environmental pollution hazards. The application integrates Supabase for live reporting data, user authentication, and storage, alongside an AI detection service to analyze reported incidents.

## Run locally vs deployed

The application automatically detects whether it is running on a local host (`localhost`, `127.0.0.1`, LAN IP) or deployed on the web (e.g., Vercel) and routes AI requests and dashboard links accordingly without requiring manual code edits.

| | Local | Online |
|---|---|---|
| Frontend | `http://localhost:5173` | Vercel URL |
| AI API | `http://localhost:8000/detect-pollution` | Render URL |
| Organization Dashboard Link | `http://localhost:5533/` | Vercel Dashboard URL |
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

Optional overrides (leave blank for automatic defaults):
```env
VITE_AI_API_URL_LOCAL=http://localhost:8000/detect-pollution
VITE_AI_API_URL_PROD=https://pollution-detection.onrender.com/detect-pollution
VITE_AI_FALLBACK_TO_PROD=false

# External links
VITE_WORLD_3D_URL=https://decentraland.org/whats-on?world=juek396.dcl.eth
```

### 2. Live Registered Organizations Board ("Who's Working On What")

The landing page features a live "Who's Working On What" board that lists registered environmental organizations and teams in real time.

- **Data Source**: Queries `public.organizations` for `id, name, created_at` (omits sensitive fields like `email`).
- **Resilient Fallback**: If Row Level Security (RLS) silently filters table rows for the `anon` role, the frontend automatically falls back to the `public.org_names` view (created with owner rights to expose names safely).
- **Real-Time Updates**: Subscribes to changes on the `organizations` table via Supabase Realtime (`supabase_realtime` publication). Newly registered organizations appear automatically and are highlighted with a soft green pulse for ~1.5 seconds.
- **Display Limit**: Displays organizations in registration order, showing the first 12 with a "Show all (N)" / "Show less" toggle when more than 12 are registered.

#### Database Setup & Troubleshooting
If the board displays the empty state ("No organizations have registered yet.") or an error:
1. **Apply Public Read Migration**: Run `supabase/migrations/20260920000005_org_names_public_read.sql` in the Supabase SQL Editor.
2. **Run Diagnostics**: Run `supabase/diagnostics/org_names_check.sql` in the Supabase SQL Editor to inspect row count, test `anon` role select permissions, and confirm view privileges.
3. **Register an Organization**: Click "Register Organization" on the landing page or navigate to `/register-organization` to register a team. It will immediately pop up live on the board.

### 3. Reports Assigned Organization Name (`organization_name`)

Each report stores the name of the assigned organization in `reports.organization_name`, kept automatically in sync with `reports.organization_id`:
- **Triggers**:
  - `sync_report_organization_name` (BEFORE INSERT OR UPDATE of `organization_id` on `reports`): looks up `organizations.name` and sets `organization_name` automatically.
  - `propagate_organization_rename` (AFTER UPDATE of `name` on `organizations`): updates all corresponding `reports.organization_name` rows when an organization is renamed.
- **Diagnostics**: Run `supabase/diagnostics/organization_name_check.sql` in the Supabase SQL Editor to check that the column exists, triggers are active, and no mismatch rows exist.

### 4. Organization Registration (`/register-organization`)

Organizations can register directly on the PRAKARTI REPORT app at `/register-organization`:
- **Data Flow**: Submitting the registration form invokes `supabase.auth.signUp({ email, password, options: { data: { account_type: 'organization', organization_name, member_count } } })`.
- **Database Trigger**: An `after insert on auth.users` trigger (`handle_new_organization_user`) automatically inserts the linked row into `public.organizations` with `name`, `email`, `member_count`, `user_id`, and auto-generates `team_code` via sequence.
- **Active Immediately**: Newly registered organizations are active immediately without an approval step, appearing on the landing page board and in the officer dashboard.
- **Diagnostics**: Run `supabase/diagnostics/organization_accounts_check.sql` in the Supabase SQL Editor.

#### Security Notes
- **Password Storage**: Passwords are never stored, logged, or echoed in `organizations` or any public table. Passwords exist strictly as bcrypt hashes inside Supabase Auth (`auth.users.encrypted_password`).
- **Anon RLS & Contact Emails**: The existing `anon` RLS policy allows anonymous clients to read `organizations`. Therefore, registered contact emails are accessible via API queries. If email privacy is critical in production, officer administration should migrate to authenticated Supabase Auth policies.
- **Open Registration**: Any user can register an organization. Optional hardening: enable CAPTCHA (Cloudflare Turnstile or hCaptcha) in the Supabase Dashboard under Authentication -> Bot Protection.
- **Login Separation**: Organization accounts can log in through the citizen Log In form; this is harmless and does not grant access to the officer dashboard (which uses its own officer login).

### 5. Install & Run

```bash
npm install
npm run dev
```

### 6. Build & Preview

```bash
npm run build
npm run preview
```
