# Data & Authentication

---

## Where all the data lives

Everything displayed in the app — job listings, candidates, stats, nav items — comes from a single file:

**`src/lib/constants.ts`**

This is intentional. Having one source of truth means:
- You always know where to look to change what's displayed
- There's no risk of the same data being defined in two places with different values

### What's in `constants.ts`

| Export | What it is |
|--------|-----------|
| `NAV_ITEMS` | The list of navigation links shown in the sidebar, including the Sourcing sub-links |
| `SETTINGS_NAV_ITEM` | The Settings link (kept separate so it can be rendered at the bottom of the sidebar) |
| `MOCK_USER` | The placeholder user that gets "logged in" when you sign in |
| `MOCK_JOBS` | 6 fake job postings used on the Dashboard and as options in the Pipeline dropdown |
| `MOCK_CANDIDATES` | 6 fake candidates shown in the Candidate Tracking section of the Dashboard |
| `MOCK_PIPELINE_CANDIDATES` | 8 fake candidates shown in the Pipeline screen. Most are assigned to job id `'4'` (Senior Product Engineer) so they appear by default. |
| `PIPELINE_JOB_OPTIONS` | The list of `{ value, label }` pairs used to populate the Pipeline job dropdown. Generated automatically from `MOCK_JOBS`. |
| `DASHBOARD_STATS` | The four metric boxes at the top of the Dashboard (Open Positions, Active Candidates, etc.) |
| `LOGIN_FEATURES` | The four bullet points shown on the left panel of the Login screen |

### How to add a new job

Open `src/lib/constants.ts` and add a new entry to `MOCK_JOBS`:

```ts
{
  id: '7',
  title: 'DevOps Engineer',
  description: 'Manage and improve our cloud infrastructure.',
  department: 'Infrastructure',
  location: 'Remote',
  type: 'full-time',
  status: 'open',
  postedAt: '2024-02-01',
  applicantCount: 7,
},
```

It will automatically appear on the Dashboard and in the Pipeline dropdown.

### How to add a pipeline candidate for a specific job

Add an entry to `MOCK_PIPELINE_CANDIDATES` with `jobId` matching the job you want:

```ts
{
  id: '9',
  name: 'Alex Kim',
  role: 'DevOps Engineer',
  avatarUrl: '',
  stage: 'screening',
  score: 77,
  tags: ['Kubernetes', 'Terraform', 'AWS'],
  appliedAt: '2024-02-03',
  jobId: '7',   // ← must match the job's id
},
```

---

## How authentication works

### The short version

There is no real authentication. Any email and password you type will work. The login just stores a fake user in the browser's session storage and redirects you to the dashboard.

### The longer version

The auth system has three parts:

#### 1. `AuthContext` (`src/contexts/AuthContext.tsx`)

This is a React **Context** — think of it as a shared container that any component in the app can read from. It holds:

- `user` — the currently logged-in user (or `null` if not logged in)
- `isLoading` — whether a login attempt is in progress
- `login(email, password)` — a function that signs the user in
- `logout()` — a function that clears the session

The `AuthProvider` wraps the entire app in `src/app/layout.tsx`, which is why any component can access the user without it being passed down manually through props.

#### 2. `useAuth` hook (`src/hooks/useAuth.ts`)

A shortcut. Instead of writing:
```ts
const context = useContext(AuthContext);
```
in every component that needs the user, you just write:
```ts
const { user, login, logout } = useAuth();
```

It also throws a helpful error if you accidentally use it outside of the `AuthProvider`.

#### 3. Session persistence (`sessionStorage`)

When `login()` is called successfully, the user object is saved to `sessionStorage` under the key `teamtalent_session`. This means if you refresh the page, you stay logged in. However, closing the browser tab clears the session (that's the difference between `sessionStorage` and `localStorage`).

On the first render, `AuthContext` checks `sessionStorage` for a saved session and restores it automatically.

### The login flow step by step

```
User fills in email + password
        ↓
Clicks "Sign In"
        ↓
handleSubmit() runs in login/page.tsx
        ↓
Calls login(email, password) from AuthContext
        ↓
AuthContext waits 700ms (fake network delay)
        ↓
Stores mock user in state + sessionStorage
        ↓
login/page.tsx receives control back
        ↓
router.push('/dashboard') — user is redirected
```

### The logout flow

```
User clicks their name/avatar at the bottom of the sidebar
        ↓
logout() is called from AuthContext
        ↓
User is set to null, sessionStorage is cleared
        ↓
User is back to a logged-out state
```

Note: There is currently no automatic redirect to `/login` after logout. That would be added when real route protection (middleware) is implemented.

---

## TypeScript types (`src/types/index.ts`)

Every piece of data in the app has a defined **type** — a formal description of its shape. All types live in `src/types/index.ts`.

This means TypeScript will catch it immediately if you try to, for example, display `candidate.score` on a `Candidate` (which has no score field — only `PipelineCandidate` does).

### The main data types

**`Job`**
```
id, title, description, department, location,
type (full-time/part-time/contract),
status (open/closed/draft),
postedAt (date string), applicantCount
```

**`Candidate`**
```
id, name, role, avatarUrl,
status (new/screening/interview/offer/hired/rejected),
appliedAt (date string), jobId
```

**`PipelineCandidate`**
```
id, name, role, avatarUrl,
stage (applied/screening/interview/technical/offer/hired),
score (number 0-100), tags (string[]),
appliedAt (date string), jobId
```

**`User`**
```
id, name, email, avatarUrl, role
```
