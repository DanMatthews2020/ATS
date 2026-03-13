# TeamTalent — Project Overview

## What is this?

TeamTalent is an internal **Applicant Tracking System (ATS)** and **HR Information System (HRIS)** — a tool used by HR and recruiting teams to manage job listings, track candidates, and move people through a hiring pipeline.

This is a **web application** built to run in a browser. It is not connected to a real database yet — all data is mock/placeholder data in `src/lib/constants.ts`.

---

## How to run it

```bash
npm install       # only needed once
npm run dev       # start the dev server
```

Open **http://localhost:3000** — you'll land on the login page. Enter **any email and password** to sign in (demo mode).

---

## Pages built

| Page | URL | Description |
|------|-----|-------------|
| **Login** | `/login` | Sign-in page. Split layout — branding on the left, form on the right. |
| **Dashboard** | `/dashboard` | Home after login. Stats, open job listings, recent candidates. |
| **Candidates** | `/candidates` | Full candidate list with search, status filters, and a slide-over detail drawer. |
| **Pipeline** | `/pipeline` | Candidates filtered by job. Toggle between grid and list view. |
| **Job Postings** | `/job-postings` | List of all job postings with filter tabs, stats, and applications sidebar. |
| **Create Job Posting** | `/job-postings/create` | Form to post a new job with a contextual applications sidebar. |
| **Onboarding** | `/onboarding` | 3-step onboarding wizard with profile form, task sections, and checklist sidebar. |

---

## Technology

| Technology | What it is |
|------------|-----------|
| **Next.js 14** | Framework — handles routing, SSR, and the build. |
| **TypeScript** | JavaScript with types. Catches bugs at write-time. |
| **Tailwind CSS** | Utility-first styling — classes applied directly in JSX. |
| **lucide-react** | Icon library used throughout the UI. |
| **React Context** | Used for the auth session — shared across the whole app. |
| **Playwright** | End-to-end test suite. 44 tests covering all built pages. |

---

## What is NOT built yet

- Real database — all data is in `src/lib/constants.ts`
- Real authentication — any credentials work
- Most sidebar links — only the pages above are implemented
- Backend API — no server routes or database queries
