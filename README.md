# Stackteryx

The pricing, margin, and enablement engine for profitable MSP security offerings. Stackteryx helps managed service providers build, price, and sell security tool bundles with full visibility into costs, margins, and profitability — so every deal is a good deal.

## Tech Stack

- **Next.js 15** (App Router) with TypeScript (strict mode)
- **Tailwind CSS** + **shadcn/ui** for all UI components
- **Supabase** for Auth (email magic link), Postgres, and Row Level Security
- **Zod** for validation (shared schemas between client and server)
- **react-hook-form** with `@hookform/resolvers/zod` for forms
- **Server Actions** for all mutations
- Deploy target: **Vercel**

## Prerequisites

- Node.js 18+
- pnpm
- Supabase CLI (for local development) or a Supabase project

## Setup

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd stackteryx
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up Supabase**

   Create a new project at [supabase.com](https://supabase.com) or use the Supabase CLI for local development.

4. **Run migrations**

   Apply the foundation migration to your Supabase database:

   ```bash
   supabase db push
   ```

   Or manually run the SQL in `supabase/migrations/001_foundation.sql` against your database.

5. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials.

6. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Yes |
| `WHOP_API_KEY` | Whop API key for monetization | Phase 4 |
| `WHOP_WEBHOOK_SECRET` | Whop webhook verification secret | Phase 4 |
| `WHOP_PRODUCT_ID` | Whop product ID | Phase 4 |

## Phase Roadmap

- **Phase 1: Foundation** — Auth, dashboard shell, tool catalog CRUD, RBAC, settings, audit log
- **Phase 2: Pricing Engine & Bundles** — Cost calculations, bundle builder, margin analysis
- **Phase 3: Approvals & Scenarios** — Discount approval workflows, scenario simulator
- **Phase 4: Whop & Enablement** — Monetization via Whop, enablement output generation, PDF export
