# Components Guide

Every reusable piece of UI is documented here. All components are in `src/components/`.

---

## UI Primitives (`src/components/ui/`)

These are the lowest-level building blocks. They are used everywhere and should never be re-implemented inline.

---

### `Button.tsx`

A standard clickable button.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `primary` \| `secondary` \| `ghost` \| `danger` | `primary` | Controls the colour scheme |
| `size` | `sm` \| `md` \| `lg` | `md` | Controls height and padding |
| `isLoading` | `boolean` | `false` | Shows a spinning indicator and disables the button |
| `children` | React content | required | The button label |

**Variants explained:**
- `primary` — Black background, white text. Used for main actions (e.g. "Sign In", "View").
- `secondary` — White background with a border. Used for less important actions.
- `ghost` — No background. Used for subtle/tertiary actions.
- `danger` — Red background. Used for destructive actions (e.g. delete).

**Example:**
```tsx
<Button variant="primary" size="md">Save Changes</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button isLoading={true}>Saving...</Button>
```

---

### `Input.tsx`

A text input field with an optional label and error message.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Text shown above the input |
| `error` | `string` | Red error message shown below the input |
| `hint` | `string` | Grey helper text shown below the input (only if no error) |
| + all standard HTML input props | | `type`, `placeholder`, `value`, `onChange`, etc. |

**Example:**
```tsx
<Input
  label="Email address"
  type="email"
  placeholder="you@company.com"
  error="Please enter a valid email"
/>
```

---

### `Card.tsx`

A white box with a rounded border and subtle drop shadow. Used as the container for job cards, candidate cards, and stat boxes.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `none` \| `sm` \| `md` \| `lg` | `md` | Internal spacing |
| `children` | React content | required | Anything inside the card |
| + all standard HTML div props | | `className`, `onClick`, etc. |

**Example:**
```tsx
<Card padding="md">
  <p>This content sits inside a white card.</p>
</Card>
```

---

### `Badge.tsx`

A small pill-shaped label used to show a status or category.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `default` \| `success` \| `warning` \| `error` \| `info` | `default` | Colour scheme |
| `children` | text | required | The label text |

**Colour meanings:**
- `default` — Grey. Neutral/unknown status (e.g. "Applied", skill tags).
- `success` — Green. Positive status (e.g. "Open", "Hired", "Offer").
- `warning` — Amber. In-progress status (e.g. "Interview", "Screening").
- `error` — Red. Negative status (e.g. "Rejected", "Closed").
- `info` — Blue. Informational status (e.g. "New").

**Example:**
```tsx
<Badge variant="success">Open</Badge>
<Badge variant="warning">Interview</Badge>
```

---

### `Avatar.tsx`

A circular element showing a person's initials. Used wherever a profile photo would normally appear.

**How the colour works:** The background colour is determined by the first letter of the person's name. This means the same person always gets the same colour — it's consistent, not random.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | The person's full name (used for initials and colour) |
| `size` | `sm` \| `md` \| `lg` | `md` | Controls the circle size |

**Example:**
```tsx
<Avatar name="Sarah Johnson" size="md" />
// Renders a circle with "SJ" inside
```

---

## Layout (`src/components/layout/`)

---

### `Sidebar.tsx`

The persistent left navigation panel shown on all dashboard pages.

**This component should only ever be used in `src/app/(dashboard)/layout.tsx`.** Individual pages must never import it directly.

**What it does internally:**
1. Reads the navigation items from `lib/constants.ts`
2. Uses `usePathname()` to know which page is currently active
3. Highlights the active nav item with a black background
4. Renders sub-items for "Sourcing" (People Search, AI Sourcing Agent, Unified Search) indented beneath the parent
5. Shows the logged-in user's name and role at the bottom, with a logout action

**It is a client component** because it needs `usePathname()` (which only works in the browser) and `useAuth()` (which reads from React Context).

---

## Dashboard Components (`src/components/dashboard/`)

---

### `JobListingCard.tsx`

Displays a single job posting as a card.

**Props:** `job: Job`

**What it shows:**
- Job title and department
- Status badge (Open / Closed / Draft)
- Description (capped at 2 lines)
- Location and employment type
- Number of applicants
- A "View" button

---

### `CandidateCard.tsx`

Displays a single candidate in the Candidate Tracking section of the dashboard.

**Props:** `candidate: Candidate`

**What it shows:**
- Avatar with initials
- Candidate name and role
- Status badge (New / Screening / Interview / Offer / Hired / Rejected)
- Application date

---

## Pipeline Components (`src/components/pipeline/`)

---

### `PipelineCandidateCard.tsx`

Displays a single candidate in the Pipeline screen. Renders in two different layouts depending on the `viewMode` prop.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `candidate` | `PipelineCandidate` | The candidate data to display |
| `viewMode` | `'grid'` \| `'list'` | Controls whether to use the card layout or compact row layout |

**Grid view shows:** Avatar, name, role, score, stage badge, application date, skill tags

**List view shows:** The same information arranged horizontally in a compact row. Tags are hidden on small screens to avoid overflow.

**Score indicator:** A star icon followed by the score number. Colour changes based on value (green ≥ 85, amber ≥ 70, grey below 70).
