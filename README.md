# Whisper — Anonymous social network MVP

A responsive React + Vite starter with a leaf-green visual identity, light and dark themes, anonymous handles, confessions, reactions, comments, topic communities, search/sort, reporting UI, and account privacy settings.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

### Demo mode

With `.env` blank, Whisper runs in local demo mode:
- Example confessions and communities are seeded.
- Posts, reactions, comments, profile preferences, joined communities, and theme are stored in the current browser's `localStorage`.
- This is a frontend prototype only. Local demo data is not shared across browsers/devices and is not a secure account system.
- Sign-in opens a setup hint rather than pretending to create a real account.

## Enable Supabase authentication and prepare the database

1. Create a project at [Supabase](https://supabase.com/).
2. In the project SQL Editor, run `supabase/schema.sql`.
3. In Project Settings → API, copy the project URL and the publishable/anon key.
4. Put them in `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

5. Restart `npm run dev`.

The sign-in/sign-up modal then uses Supabase Auth. The supplied SQL defines profiles, communities, membership, confessions, reactions, comments and reports with Row Level Security (RLS).

**Important scope note:** This is a UI-first MVP. Only Supabase authentication is connected in this starter; feed actions still use local browser storage. Before launch, connect the UI CRUD actions to Supabase, test every RLS policy, add server-side moderation and rate limits, and test on a separate test account. Do not claim production-grade anonymity or privacy until this work is complete.

## Theme and privacy behavior

- Light mode: white surfaces with forest/leaf green accents.
- Dark mode: near-black green surfaces and lighter leaf-green accents.
- Theme choice persists in this browser.
- Account profile has a public/private setting. In this UI starter it is a preference, not yet a server-enforced access control.
- A confession can be marked “Only me — private note” in the composer. In demo mode this only affects the local UI. Wire it to the database and test RLS before using real users.

## Deployment (frontend demo)

1. Push this folder to a Git repository.
2. Import the repository into [Vercel](https://vercel.com/).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment variables if using Supabase Auth.
4. Deploy.

Vite builds the static frontend with `npm run build`.

## Before inviting real users

- Wire confessions, comments, reactions, community membership and reports to Supabase.
- Implement private-account semantics server-side (who can see posts, comments and profile details).
- Use pseudonymous public handles; never expose auth email in public queries.
- Add server-side rate limiting, spam/abuse prevention, content review queues and moderator roles.
- Do not let browser clients delete reports or mark them resolved.
- Add a process for threats, self-harm content, doxxing, impersonation and appeals.
- Add account deletion/export, password recovery, privacy policy and terms.
- Configure CAPTCHA, email verification, secure redirect URLs and logging retention.
- Test with at least two accounts and verify that a user cannot read another account's private content.

## Project structure

```text
whisper-mvp/
├── index.html
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   └── supabase.js
└── supabase/
    └── schema.sql
```
