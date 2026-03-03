# Talli — AI-Powered Task Manager

Enterprise-grade task management for recruitment teams, built with Next.js 14, Supabase, and Gemini AI.

## Features

**Task Management**
- Drag-and-drop task board (Urgent / Pending / Completed)
- Subtasks with progress bar, task dependencies, recurring tasks
- File attachments (Supabase Storage), task watchers
- Bulk actions, filters, pinned tasks, tags

**Collaboration**
- Workspace-based multi-user with invite codes (format: `abc12345`)
- Task assignment, @mentions in comments
- Notification center (in-app + push + email)
- Activity feed, member workload view

**AI (Gemini 2.0 Flash)**
- Dashboard AI summary
- Natural language task creation
- Auto subtask generation
- Priority & deadline suggestions
- Daily briefing + weekly recap
- Overdue risk alerts

**Other**
- Calendar view
- PWA — installable on mobile
- Push + Email notifications (Brevo)
- Auto cron reminders

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Poppins |
| Auth | NextAuth v5 (Google + Email) |
| Database | Supabase (Postgres + RLS + Realtime) |
| Storage | Supabase Storage |
| AI | Gemini 2.0 Flash + 2.5 Flash |
| Email | Brevo (no domain required) |
| Push | Web Push API + VAPID |
| Drag & Drop | @dnd-kit |
| Deployment | Vercel |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/talli.git
cd talli
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values (see sections below).

### 3. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → paste `supabase/schema.sql` → Run
3. Storage → Create bucket named `task-attachments` → Set to Public
4. Copy Project URL and anon key

### 4. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-app.vercel.app/api/auth/callback/google`

### 5. Gemini API

1. [aistudio.google.com](https://aistudio.google.com) → Get API Key (free)
2. Set as both `GEMINI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY`

### 6. Brevo Email

1. [brevo.com](https://brevo.com) → Sign up free
2. SMTP & API → API Keys → Create key
3. No custom domain needed

### 7. Web Push VAPID keys

```bash
npx web-push generate-vapid-keys
```

### 8. NextAuth secret

```bash
openssl rand -base64 32
```

### 9. Run locally

```bash
npm run dev
```

---

## Vercel Deployment

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add all env vars from `.env.example` in Vercel Dashboard → Settings → Environment Variables
4. Set `NEXTAUTH_URL` to your production URL
5. Set `CRON_SECRET` to a random string
6. Deploy

The `vercel.json` cron job runs every hour to send due reminders.

---

## Project Structure

```
talli/
├── app/
│   ├── (auth)/              # Login, forgot password
│   ├── (onboarding)/        # Workspace create/join
│   ├── (app)/               # Dashboard, Calendar, Members, Activity
│   └── api/                 # Tasks, AI, notifications, cron
├── components/
│   ├── ai/                  # NLTaskCreator
│   ├── auth/                # LoginForm, SignupForm
│   ├── dashboard/           # TaskColumn, StatsWidget, AISummaryBanner, FilterBar
│   ├── layout/              # Sidebar, Topbar, MobileNav, AppShell
│   ├── notifications/       # NotificationCenter
│   ├── tasks/               # TaskCard, TaskDetailModal, CreateTaskModal, etc.
│   └── ui/                  # Button, Input, Modal, Badge, Avatar, Logo
├── hooks/                   # useTasks, useWorkspace
├── lib/                     # auth, supabase, utils, brevo, push
├── public/                  # manifest.json, sw.js (PWA)
├── supabase/                # schema.sql
├── types/                   # TypeScript types
└── vercel.json              # Cron config
```

---

## Build Phases Completed

- [x] Phase 1 — Auth, workspace setup, login UI
- [x] Phase 2 — Dashboard, task columns, task CRUD, drag & drop
- [x] Phase 3 — Task detail modal, subtasks, dependencies, attachments, watchers
- [x] Phase 4 — Comments with @mentions, notifications, activity feed
- [x] Phase 5 — AI features (NL creation, daily briefing, overdue risk, weekly recap)
- [x] Phase 6 — Calendar view, members + workload, filters, bulk actions
- [x] Phase 7 — Push + email notifications, PWA, cron reminders
