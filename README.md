# Soma Africa — Phase 1 Waitlist

Grade intelligence and parent notification platform for Ugandan private schools.

**Goal:** Capture 150 qualified leads from school directors before product build.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set environment variables
```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_WAITLIST_COUNT=47
```

### 3. Set up Supabase
- Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
- Go to **SQL Editor → New query**
- Paste and run the contents of `supabase-schema.sql`

This creates the `leads` table with RLS enabled.

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub — Vercel redeploys automatically on every push to `main`
2. Add environment variables in **Vercel → Project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_WAITLIST_COUNT`

---

## Weekly maintenance

Update the waitlist counter in Vercel environment variables:

**Vercel → Project → Settings → Environment Variables → `NEXT_PUBLIC_WAITLIST_COUNT`**

Change the value and redeploy. No code change needed.

---

## Sections

| # | Section          | Background  | ID                |
|---|------------------|-------------|-------------------|
| 1 | Hero             | `#0D0D0D`   | `#hero`           |
| 2 | The Problem      | `#FAF3E0`   | `#problem`        |
| 3 | How It Works     | `#0D0D0D`   | `#how-it-works`   |
| 4 | Calculator       | `#FAF3E0`   | `#calculator`     |
| 5 | Founding Schools | `#0D0D0D`   | `#founding-schools` |
| 6 | Waitlist Form    | `#FAF3E0`   | `#waitlist`       |

---

## Commission formula

```
UGX 8,000 gross per student per month
School commission: 20% = UGX 1,600 / student / month
Teacher pool:     15% = UGX 1,200 / student / month
Annual multiplier: × 10 months

Founding rate: 35% = UGX 2,800 / student / month
```

---

## Stack

- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** — utility classes + custom component layer
- **Framer Motion** — scroll-reveal animations (FadeUp)
- **Supabase** — PostgreSQL + Row Level Security
- **Vercel** — hosting + CI/CD

---

## Security notes

- `.env.local` is gitignored — never commit credentials
- Only the `anon` key is used in the frontend (`NEXT_PUBLIC_*`)
- The `service_role` key must never appear in any frontend file
