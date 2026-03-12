# The Three Screens

---

## 1. Login Screen (`/login`)

**File:** `src/app/(auth)/login/page.tsx`

### What it looks like
A split two-column layout:
- **Left side (dark):** Branding panel with the TeamTalent logo, a headline, and a list of platform features. Purely visual — no interactive elements.
- **Right side (light):** A simple form with an email field, a password field, a "Forgot password?" link, and a Sign In button.

### How it works
1. The user types any email and password and clicks Sign In.
2. The form calls the `login()` function from `AuthContext`.
3. `login()` waits 700ms (simulating a real API call), then stores a mock user object in `sessionStorage`.
4. The page redirects to `/dashboard`.
5. If the email or password field is empty, an error message is shown before any login attempt.

### Why it has no sidebar
The login page lives inside the `(auth)` route group. The `(dashboard)` layout (which renders the sidebar) does not wrap this page. This is intentional — an unauthenticated user should never see the navigation.

---

## 2. Dashboard Screen (`/dashboard`)

**File:** `src/app/(dashboard)/dashboard/page.tsx`

### What it looks like
The main home screen after logging in. It has four sections:

1. **Page header** — Title ("Dashboard") and a subtitle.
2. **Stat cards** — A row of four metrics: Open Positions, Active Candidates, Interviews Scheduled, Offers Sent. Each shows a number and whether it's trending up or down.
3. **Job Listings** — A card grid showing the first 3 jobs from the mock data. Each card shows the job title, department, location, type, applicant count, a status badge, and a View button.
4. **Candidate Tracking** — A card grid showing the first 3 candidates. Each card shows the candidate's name, role, current status (e.g. "Interview", "Offer"), and the date they applied.

### How it works
This page is a **server component** — it does not use any React state or browser APIs. It simply reads data directly from `lib/constants.ts` and renders it. Because there is no client-side logic, it loads fast and is pre-rendered at build time.

### Data shown
- Stats come from `DASHBOARD_STATS` in `constants.ts`
- Jobs come from the first 3 items of `MOCK_JOBS`
- Candidates come from the first 3 items of `MOCK_CANDIDATES`

---

## 3. Pipeline Screen (`/pipeline`)

**File:** `src/app/(dashboard)/pipeline/page.tsx`

### What it looks like
A page for reviewing candidates for a specific job role. It has:

1. **Page header** — Title ("Pipeline") with a subtitle showing the candidate count and selected role.
2. **Job selector dropdown** — A `<select>` element listing all jobs from `constants.ts`. Changing it filters the candidates shown.
3. **View mode toggle** — Two buttons to switch between **grid view** (cards in a 3-column grid) and **list view** (compact horizontal rows).
4. **Candidate cards** — Each card shows the candidate's name, role, avatar, stage (e.g. "Interview", "Offer"), a score (out of 100), the date they applied, and skill tags.

### How it works
This page is a **client component** (marked with `'use client'`) because it needs two pieces of React state:
- `selectedJobId` — which job is currently selected in the dropdown
- `viewMode` — whether to show grid or list

When `selectedJobId` changes, the candidate list is filtered using `.filter()` — no API call is made, just filtering the in-memory array.

The `PipelineCandidateCard` component renders differently based on the `viewMode` prop:
- **Grid:** Stacked layout with avatar, stage badge, score, date, and tags
- **List:** Compact horizontal row — same information, less vertical space

### Score colours
The score indicator uses different colours based on the value:
- **Green** (≥ 85) — strong candidate
- **Amber** (≥ 70) — reasonable candidate
- **Grey** (< 70) — weaker candidate

---

## The Sidebar (shared across all dashboard pages)

**File:** `src/components/layout/Sidebar.tsx`
**Mounted in:** `src/app/(dashboard)/layout.tsx`

The sidebar is rendered **once** in the dashboard layout and persists across all pages inside `(dashboard)`. It is never imported by individual page files.

### What it contains
- **Logo** at the top
- **Navigation links** — Dashboard, Sourcing (with 3 sub-links), Candidates, Pipeline, Job Postings, Talent Insights, Onboarding, Performance, Reports
- **Settings link** at the bottom
- **User profile button** at the very bottom — shows the logged-in user's name and role. Clicking it logs out.

### How active states work
The sidebar uses `usePathname()` (a Next.js hook) to get the current URL. It compares each nav item's `href` against the current path. If they match, that item gets a solid black background and white text. All others stay grey.
