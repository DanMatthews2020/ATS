# TeamTalent — Component & Design Guide

This is the single source of truth for all reusable components, design tokens, and page patterns. When building a new page, start here. All components live in `src/components/`.

---

## Design Tokens

Defined as CSS variables in `src/app/globals.css` and extended in `tailwind.config.ts`. **Always use these — never hardcode colours or fonts.**

| Token | Value | Use for |
|-------|-------|---------|
| `--color-primary` | `#0A0A0A` | Black — buttons, headings, active states |
| `--color-accent` | `#F97316` | Orange — highlights, icons on dark backgrounds |
| `--color-surface` | `#F8F8F7` | Off-white — page backgrounds |
| `--color-border` | `#E5E5E3` | Light grey — card borders, dividers |
| `--color-text-primary` | `#0A0A0A` | Main body text |
| `--color-text-muted` | `#6B7280` | Secondary text, labels, placeholders |
| `--sidebar-width` | `220px` | Width of the left sidebar |

**Fonts:**
- `font-sans` → DM Sans — used for all body text and UI
- `font-serif` → DM Serif Display — used sparingly for hero/display headings (login page only)

**Box shadows** (apply as Tailwind classes):
- `shadow-card` — subtle shadow for cards at rest
- `shadow-card-hover` — stronger shadow on hover

---

## UI Primitives (`src/components/ui/`)

These are the lowest-level building blocks. **Never re-implement these inline** — always import and use these components.

---

### `Button.tsx`

A clickable button with four visual styles and three sizes.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `primary` \| `secondary` \| `ghost` \| `danger` | `primary` | Visual style |
| `size` | `sm` \| `md` \| `lg` | `md` | Height and padding |
| `isLoading` | `boolean` | `false` | Shows a spinner and disables the button |
| `children` | React content | required | Button label (can include icons) |
| + all HTML button props | | | `onClick`, `type`, `disabled`, etc. |

**When to use each variant:**
- `primary` — Black bg, white text. Main/confirm actions: "Save", "Add Candidate", "Sign In"
- `secondary` — White bg, border. Supporting actions: "Send Email", "Cancel"
- `ghost` — Transparent. Subtle/tertiary actions in toolbars or dense UIs
- `danger` — Red bg. Destructive actions: "Delete", "Remove"

**Usage:**
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md">Add Candidate</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="primary" isLoading={isSaving}>Saving...</Button>

// With an icon (icons go before the label)
import { Plus } from 'lucide-react';
<Button variant="primary"><Plus size={15} />New Posting</Button>
```

---

### `Input.tsx`

A text input or textarea with label, error, and hint support.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Text above the input (auto-generates the `id`) |
| `error` | `string` | Red error text below the input |
| `hint` | `string` | Grey helper text below the input (hidden when `error` is set) |
| `multiline` | `boolean` | Renders a `<textarea>` instead of `<input>` |
| `rows` | `number` | Number of rows (only used when `multiline` is true) |
| + all standard HTML input/textarea props | | `type`, `placeholder`, `value`, `onChange`, etc. |

**Usage:**
```tsx
import { Input } from '@/components/ui/Input';

<Input label="Job Title" placeholder="e.g. Senior Engineer" />
<Input label="Password" type="password" error="Password is required" />
<Input label="Description" multiline rows={6} />
```

---

### `Card.tsx`

A white rounded container with a border and shadow. Used as the wrapper for most content blocks.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `none` \| `sm` \| `md` \| `lg` | `md` | Internal spacing |
| `children` | React content | required | Anything inside the card |
| + all HTML div props | | | `className`, `onClick`, etc. |

**Usage:**
```tsx
import { Card } from '@/components/ui/Card';

<Card padding="md">
  <p>This content sits inside a white card.</p>
</Card>

// With custom hover styling
<Card padding="lg" className="hover:shadow-card-hover transition-shadow cursor-pointer">
  ...
</Card>
```

---

### `Badge.tsx`

A small pill-shaped label for statuses, categories, or tags.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `default` \| `success` \| `warning` \| `error` \| `info` | `default` | Colour |
| `children` | text | required | The label text |
| `className` | `string` | `''` | Additional classes (e.g. `mt-1`) |

**Colour guide:**
| Variant | Colour | Use for |
|---------|--------|---------|
| `default` | Grey | Neutral / unknown (e.g. "Applied", skill tags, "In Review") |
| `success` | Green | Positive (e.g. "Hired", "Open", "Offer Sent") |
| `warning` | Amber | In-progress (e.g. "Interviewing", "Screening") |
| `error` | Red | Negative (e.g. "Rejected", "Closed") |
| `info` | Blue | New / informational (e.g. "Available", "New") |

**Usage:**
```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="success">Hired</Badge>
<Badge variant="warning">Interviewing</Badge>
<Badge variant="info">Available</Badge>
```

---

### `Avatar.tsx`

A circular element showing a person's initials. Colour is deterministic — the same name always produces the same colour.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Full name — used for initials and colour |
| `size` | `sm` \| `md` \| `lg` | `md` | Circle size (`w-7`, `w-10`, `w-12`) |

**Usage:**
```tsx
import { Avatar } from '@/components/ui/Avatar';

<Avatar name="Emma Johnson" size="md" />   // → "EJ" in a coloured circle
<Avatar name="Michael Brown" size="lg" />  // → "MB", larger
```

---

## Layout (`src/components/layout/`)

---

### `Sidebar.tsx`

The persistent left navigation panel rendered on every dashboard page.

**Only used in `src/app/(dashboard)/layout.tsx`.** Individual pages must never import it directly.

**Behaviour:**
- Reads nav items from `lib/constants.ts` (`NAV_ITEMS`, `SETTINGS_NAV_ITEM`)
- Highlights the active link using `usePathname()`
- Active item: black background, white text
- Inactive item: muted grey text with hover highlight
- "Sourcing" expands to show child links indented below it
- Bottom footer shows logged-in user's name + role; clicking logs out

**Adding a new nav item:** Add an entry to `NAV_ITEMS` in `src/lib/constants.ts` with `label`, `href`, and `icon`. The icon must be a key from `IconName` in `src/types/index.ts` (maps to a lucide-react icon).

---

## Dashboard Components (`src/components/dashboard/`)

---

### `CandidateCard.tsx`

A card showing a single candidate in the Dashboard's "Recent Candidates" section.

**Props:** `candidate: Candidate`

**Displays:** Avatar · Name · Role · Status badge · Applied date

---

### `JobListingCard.tsx`

A card showing a single job posting on the Dashboard.

**Props:** `job: Job`

**Displays:** Title · Department · Status badge · Description (2 lines max) · Location · Type · Applicant count · "View" button

---

## Pipeline Components (`src/components/pipeline/`)

---

### `PipelineCandidateCard.tsx`

A candidate card for the Pipeline page. Renders differently in grid vs list view.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `candidate` | `PipelineCandidate` | Candidate data |
| `viewMode` | `'grid'` \| `'list'` | Layout mode |

**Grid:** Avatar · Name · Role · Stage badge · Score indicator · Applied date · Skill tags

**List:** Same info in a compact horizontal row. Tags hidden on small screens.

**Score colours:** Green ≥ 85 · Amber ≥ 70 · Grey < 70

---

## Candidates Components (`src/components/candidates/`)

---

### `CandidateDrawer.tsx`

A slide-over panel that appears from the right when a candidate row is clicked. Used on the Candidates Management page and can be reused on any page that needs a candidate detail view.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `candidate` | `CandidateProfile \| null` | The candidate to show. Pass `null` to close the drawer |
| `onClose` | `() => void` | Called when the user clicks X or the backdrop |

**Behaviour:**
- Slides in from the right with a 300ms ease-in-out transition
- Semi-transparent backdrop with blur closes the drawer on click
- When `candidate` is `null`, panel is off-screen and invisible to screen readers
- Scrollable body — safe for candidates with lots of content

**Sections displayed:**
1. Header — Avatar (lg), name, role, status badge, close button
2. Contact — Email (link), phone, location (with icons)
3. Application — Job applied for, applied date, experience
4. Skills — Tag pills
5. Education — Shown if present
6. Notes — Shown if present
7. Footer actions — "Schedule Interview" (primary) · "Send Email" · "Move Forward" (hidden for hired/rejected)

**Usage:**
```tsx
import { CandidateDrawer } from '@/components/candidates/CandidateDrawer';

// In a page component:
const [selected, setSelected] = useState<CandidateProfile | null>(null);

<CandidateDrawer
  candidate={selected}
  onClose={() => setSelected(null)}
/>
```

---

## Page Patterns

These are recurring layout patterns used across the 4 pages. Follow these exactly when building new pages to keep the design consistent.

---

### Pattern 1 — Standard Page Shell

Used by: Candidates, Pipeline, Dashboard

```tsx
<div className="min-h-screen bg-[var(--color-surface)]">
  <div className="px-8 py-8 max-w-5xl">

    {/* Page header */}
    <div className="flex items-center justify-between mb-7">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
          <IconName size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Page Title</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Subtitle or count</p>
        </div>
      </div>
      <Button variant="primary"><Plus size={15} />Primary Action</Button>
    </div>

    {/* Page content */}

  </div>
</div>
```

---

### Pattern 2 — Search Bar

Used by: Candidates Management

```tsx
<div className="flex gap-2.5 mb-5">
  <div className="relative flex-1">
    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
    <input
      type="text"
      placeholder="Search..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
    />
  </div>
  <Button variant="primary" onClick={handleSearch}>Search</Button>
</div>
```

---

### Pattern 3 — Filter Tabs (Underline Style)

Used by: Candidates Management. Apply above a list to filter by category.

```tsx
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  // ...
];

<div className="flex items-center gap-0.5 mb-6 border-b border-[var(--color-border)]">
  {TABS.map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key)}
      className={[
        'px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
        activeTab === tab.key
          ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-neutral-300',
      ].join(' ')}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

### Pattern 4 — Clickable List Row

Used by: Candidates Management. For any list of items that open a detail view.

```tsx
<ul className="space-y-3">
  {items.map((item) => (
    <li key={item.id}>
      <button
        onClick={() => setSelected(item)}
        className="w-full text-left bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 group"
      >
        <Avatar name={item.name} size="md" />
        <div className="w-48 flex-shrink-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.subtitle}</p>
        </div>
        <div className="flex-1 min-w-0">
          {/* Middle column content */}
        </div>
        <div className="flex-shrink-0">
          <Badge variant="info">Status</Badge>
        </div>
      </button>
    </li>
  ))}
</ul>
```

---

### Pattern 5 — Toggle Buttons (Grid / List View)

Used by: Pipeline. For toggling between two layout modes.

```tsx
<div role="group" aria-label="View mode" className="flex items-center bg-white border border-[var(--color-border)] rounded-xl p-1 gap-0.5">
  <button
    type="button"
    onClick={() => setViewMode('grid')}
    aria-pressed={viewMode === 'grid'}
    aria-label="Grid view"
    className={[
      'p-2 rounded-lg transition-colors duration-100 outline-none',
      viewMode === 'grid'
        ? 'bg-[var(--color-primary)] text-white'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]',
    ].join(' ')}
  >
    <LayoutGrid size={14} />
  </button>
  <button
    type="button"
    onClick={() => setViewMode('list')}
    aria-pressed={viewMode === 'list'}
    aria-label="List view"
    className={[
      'p-2 rounded-lg transition-colors duration-100 outline-none',
      viewMode === 'list'
        ? 'bg-[var(--color-primary)] text-white'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]',
    ].join(' ')}
  >
    <List size={14} />
  </button>
</div>
```

---

### Pattern 6 — Empty State

Used by: Candidates, Pipeline. Show when a filtered list returns no results.

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center mb-4 shadow-card">
    <IconName size={20} className="text-[var(--color-text-muted)]" />
  </div>
  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Nothing here</p>
  <p className="text-sm text-[var(--color-text-muted)] mt-1">Try adjusting your filters</p>
</div>
```

---

### Pattern 7 — Split Login Layout

Used by: Login page only.

Left panel (54% width, dark): Logo · decorative blobs/grid · hero `<h1>` (serif font) · feature checklist · copyright
Right panel (flex-1, surface bg): Centred form with `max-w-[340px]` · `<h2>` heading · Input components · Button

---

### Pattern 8 — Form Page with Sidebar

Used by: Create Job Posting. A two-column layout for pages with a form + contextual sidebar.

```
[Main form area (flex-1)] | [Sidebar panel (w-80)]
```

The sidebar uses `Card` with `padding="md"` and shows related contextual info (e.g. recent applications).

---

## Status Label Mapping

When displaying `CandidateStatus` values as human-readable labels, use this mapping consistently:

| Status value | Display label | Badge variant |
|---|---|---|
| `new` | Available | `info` |
| `screening` | In Review | `default` |
| `interview` | Interviewing | `warning` |
| `offer` | Offer Sent | `success` |
| `hired` | Hired | `success` |
| `rejected` | Rejected | `error` |

---

## Icons

All icons come from `lucide-react`. Import only what you use:

```tsx
import { Users, Plus, Search, X, Mail, Phone, MapPin } from 'lucide-react';
```

**Standard sizes:** `size={14}` for inline/small · `size={16}` for buttons · `size={20}` for page header icons

**Icons used per page:**
- Sidebar: `LayoutDashboard`, `Search`, `Users`, `Layers`, `Briefcase`, `BarChart2`, `ClipboardList`, `Star`, `FileText`, `Settings`
- Candidates: `Users`, `Plus`, `Search`, `X`, `Mail`, `Phone`, `MapPin`, `Calendar`, `Briefcase`, `Clock`
- Pipeline: `LayoutGrid`, `List`, `SlidersHorizontal`
- Login: `Users`, `ArrowRight`, `Sparkles`, `CheckCircle2`

---

## Data & Types

All mock data lives in `src/lib/constants.ts`. All TypeScript types live in `src/types/index.ts`.

**Key types for building new pages:**

| Type | Use for |
|------|---------|
| `Candidate` | Dashboard candidate cards |
| `CandidateProfile` | Candidates page + drawer (includes email, phone, skills, etc.) |
| `PipelineCandidate` | Pipeline cards |
| `Job` | Job listing cards |
| `CandidateStatus` | `new` \| `screening` \| `interview` \| `offer` \| `hired` \| `rejected` |
| `BadgeVariant` | `default` \| `success` \| `warning` \| `error` \| `info` |
