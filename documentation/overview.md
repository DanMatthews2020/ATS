# TeamTalent — Project Overview

## What is this?

TeamTalent is an internal **Applicant Tracking System (ATS)** and **HR Information System (HRIS)** — basically a tool used by HR and recruiting teams to manage job listings, track candidates, and move people through a hiring pipeline.

This is a **web application** built to run in a browser. It is not connected to a real database yet — all the data you see is placeholder/mock data that lives directly in the code.

---

## How to run it

```bash
# Install dependencies (only needed once)
npm install

# Start the development server
npm run dev
```

Then open your browser and go to: **http://localhost:3000**

You'll be taken to the login page. Enter **any email and password** to sign in (it's a demo — no real authentication).

---

## The three screens

| Screen | URL | What it does |
|--------|-----|-------------|
| **Login** | `/login` | Sign-in page. Split layout — branding on the left, form on the right. |
| **Dashboard** | `/dashboard` | Home page after login. Shows key stats, open job listings, and recent candidates. |
| **Pipeline** | `/pipeline` | Shows candidates for a selected job. You can switch between grid and list view. |

---

## Technology used (in plain English)

| Technology | What it is |
|------------|-----------|
| **Next.js 14** | The framework that powers the whole app. Handles routing (what URL shows what page), server-side rendering, and the build process. |
| **TypeScript** | JavaScript with types. Means every variable and function has a defined shape, which catches bugs early. |
| **Tailwind CSS** | A styling system. Instead of writing separate CSS files, you apply small utility classes directly in the HTML (e.g. `text-sm`, `bg-white`, `rounded-xl`). |
| **lucide-react** | A library of clean, consistent icons used throughout the UI. |
| **React Context** | A built-in React tool used here to store the logged-in user's session and share it across the whole app without passing it manually through every component. |

---

## What is NOT in this project (yet)

- A real database — all data is hardcoded in `src/lib/constants.ts`
- A real login system — any email/password combination works
- Working navigation for most sidebar links — only `/dashboard` and `/pipeline` are built
- Backend API — there are no server routes or database queries
