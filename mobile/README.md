# Flashy Mobile

iOS / Android version of Flashy built with Expo + Supabase. Runs in **Expo Go** on your iPhone.

## What it does
- Email/password auth (Supabase Auth)
- Per-user sets, cards, and quiz results in Supabase Postgres (RLS enforced)
- Study mode (flip + shuffle) and multiple-choice Quiz mode

## Setup

### 1. Create the Supabase project
1. Go to https://supabase.com and create a project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public** key.
3. Open the **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
4. (Optional) In **Authentication → Providers → Email**, turn off "Confirm email" while developing so signups log in immediately.

### 2. Configure env
```bash
cd mobile
cp .env.example .env
```
Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

### 3. Install + run
```bash
npm install
npx expo start
```
Scan the QR code with the Expo Go app on your iPhone (App Store: "Expo Go"). Phone and laptop must be on the same Wi‑Fi.

## File map
- `app/_layout.jsx` — auth gate, routes signed-out users to `(auth)`, signed-in to `(app)`
- `app/(auth)/login.jsx`, `register.jsx` — sign in / sign up
- `app/(app)/index.jsx` — sets list (long-press a card to delete)
- `app/(app)/group/[id]/index.jsx` — set detail, add/edit/delete cards
- `app/(app)/group/[id]/study.jsx` — tap-to-flip study mode
- `app/(app)/group/[id]/quiz.jsx` — multiple-choice quiz with score
- `lib/supabase.js` — Supabase client (AsyncStorage session persistence)
- `lib/db.js` — typed wrappers around the three tables
- `supabase/schema.sql` — DDL + RLS to run once in Supabase
