# Project Structure

This document explains every folder and file in the project in plain English.

---

## Top-level files

```
/
├── package.json          — Lists all the external libraries the project needs, and defines the run/build commands
├── tsconfig.json         — Settings for TypeScript (the rules it enforces)
├── tailwind.config.ts    — Configures the design system (custom colours, fonts)
├── next.config.mjs       — Settings for Next.js (currently empty — defaults are fine)
└── postcss.config.js     — Required by Tailwind to process CSS (you don't need to touch this)
```

---

## The `src/` folder — where all the real code lives

```
src/
├── app/           — Pages and layouts (what the user sees at each URL)
├── components/    — Reusable building blocks (buttons, cards, the sidebar, etc.)
├── contexts/      — Shared state (the logged-in user)
├── hooks/         — Shortcut functions for accessing shared state
├── lib/           — Shared data and configuration
└── types/         — TypeScript type definitions (the "shapes" of all data)
```

---

## `src/app/` — Pages

Next.js uses **file-based routing**: the folder structure maps directly to URLs.

```
src/app/
├── page.tsx                          — The root URL (/). Just redirects to /login.
├── layout.tsx                        — Wraps every page. Sets up fonts, metadata, and the auth provider.
├── globals.css                       — Global CSS styles and design system variables (colours, sidebar width, etc.)
│
├── (auth)/                           — Route group for unauthenticated pages (NO sidebar)
│   └── login/
│       └── page.tsx                  — The login screen (/login)
│
└── (dashboard)/                      — Route group for authenticated pages (WITH sidebar)
    ├── layout.tsx                    — Renders the sidebar once, wrapping all dashboard pages
    ├── dashboard/
    │   └── page.tsx                  — The main dashboard screen (/dashboard)
    └── pipeline/
        └── page.tsx                  — The pipeline screen (/pipeline)
```

**What are route groups?**
The folders named `(auth)` and `(dashboard)` are called **route groups**. The parentheses tell Next.js: "this folder organises files but does NOT appear in the URL." This is how the login page gets no sidebar, while dashboard pages share one.

---

## `src/components/` — Reusable pieces of UI

```
src/components/
│
├── ui/                               — Generic, low-level building blocks
│   ├── Button.tsx                    — A button that accepts variant (primary/secondary/ghost/danger) and size props
│   ├── Input.tsx                     — A text input with optional label and error message
│   ├── Card.tsx                      — A white box with a border and subtle shadow
│   ├── Badge.tsx                     — A small coloured pill label (e.g. "Open", "Interview")
│   └── Avatar.tsx                    — A circle showing a person's initials in a consistent colour
│
├── layout/
│   └── Sidebar.tsx                   — The left navigation panel. Only ever used in (dashboard)/layout.tsx.
│
├── dashboard/
│   ├── JobListingCard.tsx            — A card displaying one job posting
│   └── CandidateCard.tsx             — A card displaying one candidate with their status
│
└── pipeline/
    └── PipelineCandidateCard.tsx     — A card for one candidate in the pipeline. Renders differently in grid vs list view.
```

---

## `src/types/` — Data shapes

```
src/types/
└── index.ts    — Every TypeScript interface and type used anywhere in the project lives here.
                  Nothing is defined inline in component files.
```

Key types defined here:

| Type | What it describes |
|------|------------------|
| `Job` | A job posting (title, department, location, status, etc.) |
| `Candidate` | A person who applied for a job |
| `PipelineCandidate` | A candidate in the pipeline view, with a score and skill tags |
| `User` | The logged-in user |
| `NavItem` | A navigation link in the sidebar |
| `StatCard` | One of the four stat boxes on the dashboard |
| `ButtonVariant`, `BadgeVariant`, etc. | The allowed options for UI component props |

---

## `src/lib/` — Shared data

```
src/lib/
└── constants.ts    — The ONLY place hardcoded data lives. Contains:
                      - Navigation items for the sidebar
                      - Mock jobs, candidates, and pipeline candidates
                      - Dashboard stats
                      - Login page feature list
                      - Job options for the pipeline dropdown
```

If you want to change what shows up on any screen, this is the file to edit.

---

## `src/contexts/` and `src/hooks/` — Shared state

```
src/contexts/
└── AuthContext.tsx    — Creates a "container" that holds the logged-in user's data.
                         Any component in the app can read from or write to it.

src/hooks/
└── useAuth.ts         — A one-liner shortcut: instead of writing useContext(AuthContext)
                         everywhere, you just write useAuth() and get the user + login/logout functions.
```
