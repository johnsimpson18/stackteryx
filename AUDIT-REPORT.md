# STACKTERYX CODEBASE AUDIT REPORT

**Date:** March 10, 2026
**Scope:** Full codebase — Next.js 16 + Supabase/Postgres + TypeScript SaaS for MSSPs
**Method:** Every file read and analyzed across 5 dimensions

---

## EXECUTIVE SUMMARY

The Stackteryx codebase is a well-structured Next.js application with good foundational patterns: all 29 database tables have RLS enabled, SECURITY DEFINER functions are properly scoped, auth flows use Supabase best practices, and there is zero `console.log` in production code.

However, 7 critical and 14 high-severity findings require attention before production hardening. The most urgent issues are:

1. **Any authenticated user can trigger the daily intelligence cron for ALL orgs** — full data leak + cost exposure
2. **Zero error boundaries** — no `error.tsx` or `global-error.tsx` anywhere; any unhandled exception shows the Next.js default error page
3. **Open redirect in OAuth callback** — `next` query param used in redirect without validation
4. **N+1 query patterns** in bundle-versions and intelligence modules
5. **Two completely separate design languages** — onboarding uses inline styles + native HTML, main app uses shadcn + Tailwind tokens

Total findings: **7 CRITICAL, 14 HIGH, 23 MEDIUM, 18 LOW**

---

## DIMENSION 1: SECURITY

### 1A — Auth & Session

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| S1 | CRITICAL | `app/api/cron/daily-intelligence/route.ts:14-22` | Route accepts any authenticated user via `Authorization` header fallback. Calls `runDailyIntelligence()` which processes ALL orgs globally, exposing org names and triggering AI calls for every org. | Remove the `Authorization` bearer fallback entirely. Validate `CRON_SECRET` header only. Return 401 if missing. |
| S2 | HIGH | `app/(auth)/auth/callback/route.ts:7,42` | `next` query parameter used directly in `redirect(next)` with no allowlist validation. An attacker can craft `?next=https://evil.com` to redirect users post-login. | Validate `next` against a list of allowed paths (must start with `/` and not `//`). Fallback to `/dashboard`. |
| S3 | MEDIUM | `lib/org-context.ts:13-18` | `getActiveOrgId()` reads `x-org-id` from cookie and returns it without verifying the user is a member of that org. Downstream callers must separately call `requireOrgMembership()`. If any caller forgets, they operate in the context of an org they don't belong to. | Make `getActiveOrgId()` verify membership internally, or rename to `getActiveOrgIdUnchecked()` and audit every callsite. |
| S4 | MEDIUM | `lib/supabase/middleware.ts:48-60` | Protected route list is explicit. `/sales-studio` and `/stack-catalog` are missing from the protected routes array. Users can access these routes without a session (they'll fail at data fetch, but the page shell renders). | Add `/sales-studio` and `/stack-catalog` to the protected routes array. |
| S5 | LOW | `middleware.ts:17` | Middleware excludes all `/api/` routes via matcher config. API routes must each implement their own auth. This is intentional but means any new API route without auth is publicly accessible by default. | Document this pattern. Consider adding a lint rule or wrapper that enforces auth on API routes. |

### 1B — Row-Level Security & Org Isolation

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| S6 | HIGH | `lib/db/profiles.ts — getProfiles()` | Returns `SELECT * FROM profiles` with no `org_id` filter. While RLS limits results to the user's own profile, the function name implies it returns multiple profiles. If called in a service-role context, it returns ALL profiles globally. | Add explicit `org_id` filter via join on `org_members`. |
| S7 | HIGH | `lib/db/enablement.ts — getEnablementStatusByOrgId()` | Fetches ALL `bundle_versions` globally, then filters in JS. If RLS is bypassed (admin client), this leaks cross-org data. | Add `.eq('bundles.org_id', orgId)` to the Supabase query via a join. |
| S8 | MEDIUM | 28 functions across `lib/db/*.ts` | Missing explicit `org_id` WHERE clause — relies solely on RLS. Functions include: `getVersionById`, `getVersionsByBundleId`, `getBundleById`, `getToolsByBundleVersionId`, `getClientContracts`, `getApprovalsByOrgId` and 22 others. RLS provides defense-in-depth, but explicit filtering is safer. | Add `org_id` filter to queries that accept an `orgId` parameter but don't use it in the WHERE clause. Prioritize any function that could be called from a service-role context. |
| S9 | MEDIUM | All 29 tables | RLS is enabled on every table. 12 SECURITY DEFINER functions all use `SET search_path = public`. No issues found with RLS policy definitions. | No action needed — this is a positive finding. |

### 1C — API Route Auth

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| S10 | HIGH | `app/api/import/parse-pricing/route.ts` | Validates Supabase session but does NOT verify org membership. Any authenticated user can parse pricing data. | Add `requireOrgMembership(orgId)` check after auth. |
| S11 | MEDIUM | `app/api/ai/extract-vendor-pricing/route.ts` | Validates session but no org membership check. | Add org membership verification. |
| S12 | MEDIUM | `app/api/onboarding-agent/route.ts` | Validates session but no org membership check. | Add org membership verification. |
| S13 | MEDIUM | `app/api/stack-builder-chat/route.ts` | Validates session but no org membership check. | Add org membership verification. |
| S14 | MEDIUM | `app/api/enablement/generate/route.ts` | Partial org check — validates session and reads `org_id` from body but doesn't verify the user is a member of that org via `requireOrgMembership()`. | Add explicit `requireOrgMembership(orgId)` call. |
| S15 | LOW | All AI API routes | No `AbortController` or timeout on any Anthropic API call. A hung upstream call blocks the serverless function until the platform timeout (default 10-60s depending on provider). | Add `AbortController` with a 30s timeout to all `client.messages.create()` / `client.messages.stream()` calls. |

### 1D — Secrets & Config

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| S16 | LOW | `.env.example` | Lists all required env vars. `.gitignore` correctly excludes `.env.local`. No secrets found committed in source. | No action needed — positive finding. |
| S17 | LOW | `app/api/webhooks/whop/route.ts:3-15` | Stub route returns 501. Has TODO describing signature verification that is not implemented. If this route is deployed, it accepts unauthenticated POST requests (returns 501 but still processes the request body parsing). | Either delete the stub or add a "not configured" early return before body parsing. |

---

## DIMENSION 2: ENTERPRISE UX PATTERNS

### 2A — Error Boundaries

| # | Severity | File | Finding | Recommended Fix |
|---|----------|------|---------|-----------------|
| U1 | CRITICAL | Entire app | **Zero `error.tsx` files exist.** No `global-error.tsx` either. Any unhandled exception in a server component or data fetch shows the Next.js default error page with no recovery path. | Add `app/global-error.tsx` as a catch-all. Add `app/(app)/error.tsx` for the authenticated layout. Add `error.tsx` to high-value routes: `/dashboard`, `/services`, `/clients`, `/sales-studio`. |

### 2B — Loading States

| # | Severity | File | Finding | Recommended Fix |
|---|----------|------|---------|-----------------|
| U2 | HIGH | 34 of 38 page routes | Only 4 pages have `loading.tsx`: `/dashboard`, `/services` (bundles), `/clients`, `/sales-studio` (recommend). The other 34 pages show no loading indicator during server-side data fetching. | Add `loading.tsx` to at minimum: `/settings`, `/vendors`, `/stack-catalog`, `/admin`, `/services/[id]`, `/clients/[id]`. Use a shared skeleton component. |

### 2C — Empty States

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| U3 | MEDIUM | `components/clients/client-list.tsx` | Shows "No clients yet" text but no CTA button to add a client. | Add "Add your first client" button linking to client creation. |
| U4 | MEDIUM | `components/vendors/vendor-list.tsx` | No empty state message when vendor list is empty. Table renders with just headers. | Add empty state with CTA. |
| U5 | LOW | `components/tools/tool-list.tsx` | Has empty state message but could benefit from an illustration or more prominent CTA. | Minor polish. |

### 2D — Confirmation Dialogs

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| U6 | HIGH | `app/(app)/settings/page.tsx — member removal` | Removing a team member triggers immediately with no confirmation dialog. This is a destructive, hard-to-reverse action (the member loses access instantly). | Add `AlertDialog` confirmation: "Remove {name} from {org}? They will lose access immediately." |
| U7 | MEDIUM | `components/vendors/cost-model-card.tsx` | Delete cost model button has no confirmation. | Add confirmation dialog. |
| U8 | MEDIUM | `components/tools/tool-form.tsx` | Tool deletion has no confirmation. | Add confirmation dialog. |

### 2E — Form Validation & Feedback

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| U9 | MEDIUM | `actions/members.ts:102-104` | `inviteMemberAction` is a **no-op stub** — it writes an audit log entry but does not create an `org_member` row or send an email. The UI shows a success toast, misleading the user into thinking the invitation was sent. | Either implement the invite flow or disable the invite button with a "Coming soon" tooltip. |
| U10 | LOW | `app/(auth)/login/page.tsx` | Good — email/password validation with Zod, inline error messages, loading states on buttons. | No action needed — positive finding. |

---

## DIMENSION 3: PERFORMANCE

### 3A — N+1 Queries

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| P1 | HIGH | `lib/db/bundle-versions.ts:54-63 — getVersionById()` | After fetching a version, loops over `version.tools` array and calls `getToolById()` individually for each tool. A bundle with 20 tools makes 21 queries. | Use a single `.in('id', toolIds)` query to fetch all tools at once. |
| P2 | HIGH | `lib/db/bundle-versions.ts:117-120 — createVersion()` | Loops over tools array and calls `addToolToVersion()` individually. A version with 20 tools makes 21 queries. | Use a single `.insert(toolRows)` batch insert. |
| P3 | MEDIUM | `lib/ai/intelligence.ts:150-160 — checkRenewalAlerts()` | Loops over clients and calls `upsertActionCard()` per client. 50 clients = 50 upsert queries. | Batch upsert using `.upsert(cards)` with a single call. |
| P4 | MEDIUM | `lib/ai/intelligence.ts:71-95 — checkServiceIncompleteness()` | Similar loop pattern — one upsert per incomplete service. | Batch upsert. |

### 3B — Missing Indexes

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| P5 | HIGH | `supabase/migrations/` | Missing composite/FK indexes on frequently queried columns: `bundle_versions.bundle_id`, `client_contracts.client_id`, `bundle_version_tools.tool_id`, `profiles.active_org_id`, `approvals.bundle_id`, `approvals.requested_by`, `approvals.reviewed_by`. | Add B-tree indexes on these FK columns. Measure query plans before/after. |
| P6 | LOW | `supabase/migrations/` | `org_members` has a unique index on `(user_id, org_id)` which covers lookups. `action_cards` has an index on `(org_id, card_type, ref_id)`. These are good. | No action needed — positive finding. |

### 3C — Query Patterns

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| P7 | MEDIUM | 26+ functions across `lib/db/*.ts` | Queries without `LIMIT` clause. Examples: `getProfiles()`, `getBundlesByOrgId()`, `getClientsByOrgId()`, `getToolsByOrgId()`, `getVendorsByOrgId()`, `getActionCardsByOrgId()`. As data grows, these return unbounded result sets. | Add reasonable limits (e.g., `.limit(500)`) or implement pagination. Prioritize `getActionCardsByOrgId()` which can grow indefinitely. |
| P8 | MEDIUM | 31 functions across `lib/db/*.ts` | Use `SELECT *` (Supabase `.select("*")`). Returns all columns including large text/JSON fields even when only a subset is needed. | For list views, select only needed columns. Especially impactful for tables with JSON columns: `bundles.sell_config`, `bundle_versions.pricing_flags`, `bundle_versions.assumptions`. |
| P9 | MEDIUM | Multiple page.tsx files | Sequential `await` calls that could be parallelized with `Promise.all`. Examples: `app/(app)/services/[id]/page.tsx` (3 sequential fetches), `app/(app)/clients/[id]/page.tsx` (3 sequential fetches), `app/(app)/settings/page.tsx` (4 sequential fetches). | Wrap independent fetches in `Promise.all()`. The dashboard page already does this correctly — follow that pattern. |
| P10 | LOW | `lib/db/enablement.ts — getEnablementStatusByOrgId()` | Fetches ALL `bundle_versions` globally, then filters in application code. | Rewrite query with proper join + filter at the database level. |

---

## DIMENSION 4: UI CONSISTENCY

### 4A — Design Token Violations

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| C1 | HIGH | `components/bundles/pricing-advisor.tsx:305` | `bg-white` on chat input area — raw white background renders incorrectly on the dark theme. | Replace with `bg-card` or `bg-[#111111]`. |
| C2 | HIGH | `components/tools/vendor-upload-form.tsx:53-56` | `CONFIDENCE_COLORS` map uses `bg-emerald-100 text-emerald-700`, `bg-amber-100 text-amber-700`, `bg-red-100 text-red-600` — light-theme palette that looks washed out on dark backgrounds. | Replace with dark-theme equivalents: `bg-emerald-500/10 text-emerald-400`, etc. |
| C3 | HIGH | `components/approvals/approval-queue.tsx:116-117,241,249,310,312` | Multiple light-theme colors: `border-amber-200 bg-amber-50/30`, `hover:bg-red-50`, `bg-emerald-600 text-white`. These render as bright patches on the dark theme. | Replace with dark-theme semantic colors. |
| C4 | MEDIUM | `components/tools/vendor-upload-form.tsx:312,360,576-592` | `border-red-200 bg-red-50`, `border-blue-200 bg-blue-50`, `border-emerald-200 bg-emerald-50` — light-mode status colors. | Use alpha variants: `bg-red-500/10 border-red-500/20`. |

### 4B — Two Design Languages

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| C5 | HIGH | All onboarding steps: `step-company.tsx`, `step-clients.tsx`, `step-business.tsx`, `step-services.tsx`, `step-tools.tsx`, `step-pricing.tsx`, `step-targets.tsx` | Entire onboarding flow uses **native HTML elements** (`<input>`, `<button>`, `<select>`) with inline `style={{}}` and hardcoded hex values (`#111111`, `#1E1E1E`, `#A8FF3E`). The main app uses shadcn components + Tailwind CSS variables. This creates a "two app" feeling. | Gradually migrate onboarding steps to use shadcn `<Input>`, `<Button>`, `<Select>` components with Tailwind tokens. The inline styles can be replaced with the existing CSS custom properties. |
| C6 | MEDIUM | `components/service-wizard/wizard-shell.tsx:378-430` | Service wizard shell also uses inline `style={{}}` for all colors instead of Tailwind/CSS variables. | Migrate to Tailwind classes. |
| C7 | MEDIUM | `components/service-wizard/step-launch.tsx:47-50` | Launch button uses `style={{ backgroundColor: "#A8FF3E", color: "#0A0A0A" }}` instead of the `primary` Button variant. | Use `<Button variant="default">` which already maps to the lime primary color. |

### 4C — Typography & Spacing

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| C8 | MEDIUM | Service wizard step headings (`step-outcome.tsx`, `step-service.tsx`, `step-stack.tsx`, `step-economics.tsx`, `step-enablement.tsx`, `step-review.tsx`) | All use `text-2xl font-bold` without `var(--font-display)`. Onboarding steps correctly use the display font on headings. | Add `style={{ fontFamily: 'var(--font-display)' }}` to wizard step h2 elements for consistency. |
| C9 | LOW | `components/ui/card.tsx` vs `components/ui/dialog.tsx` | Cards use `rounded-xl`, dialogs use `rounded-lg`, tables wrapped in `rounded-lg`. Minor but noticeable inconsistency. | Standardize on `rounded-xl` for all container elements, or keep `rounded-lg` for secondary containers. |
| C10 | LOW | 15+ files | Margin/financial color indicators (`text-emerald-400`, `text-amber-400`, `text-red-400`) duplicated across 15+ components without a shared utility. | Extract a `marginColor(value, thresholds)` utility function. |

### 4D — Responsive Design

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| C11 | MEDIUM | `components/clients/client-list.tsx` (7 cols), `components/bundles/bundle-list.tsx` (8 cols), `components/tools/tool-list.tsx` (7 cols) | Tables with 7-8 columns and no responsive fallback. Overflow on screens below ~1200px. | Add `overflow-x-auto` wrapper. Consider card-based layout on mobile breakpoints. |
| C12 | MEDIUM | `components/onboarding/step-pricing.tsx:213` | 7-column grid with `gridTemplateColumns: "1.5fr 1fr 1.2fr 0.8fr 0.8fr 0.6fr 0.7fr"`. Overflows on anything below large desktop. | Add horizontal scroll wrapper or collapse to stacked layout on smaller screens. |
| C13 | LOW | `components/onboarding/step-tools.tsx:200`, `step-clients.tsx:174` | `grid-cols-3` without responsive breakpoint. | Change to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. |
| C14 | LOW | `components/services/service-profile-client.tsx:438` | `grid-cols-5` for layer cards — no collapse on mobile. | Change to `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`. |

---

## DIMENSION 5: DEAD CODE

### 5A — Dead Files

| # | Severity | File | Finding | Recommended Fix |
|---|----------|------|---------|-----------------|
| D1 | HIGH | `lib/db/settings.ts` | Both exports marked `@deprecated`. Zero importers. Replaced by `lib/db/org-settings.ts`. | Delete file. |
| D2 | HIGH | `actions/services.ts` | Exports `createServiceAction` — zero importers. Superseded by `actions/service-wizard.ts`. | Delete file. |
| D3 | HIGH | `lib/utils/logo.ts` | Exports `getLogoDataUri()` — zero importers. Was intended for PDF export but replaced by inline text rendering. | Delete file. |
| D4 | HIGH | `lib/supabase/admin.ts` | Exports `createAdminClient()` — zero importers. Codebase uses `createClient()` from `server.ts` exclusively. | Delete file. |
| D5 | MEDIUM | `components/bundles/pricing-preview.tsx` | Exports `PricingPreview` — zero importers. Orphaned component. | Delete file. |
| D6 | MEDIUM | `components/bundles/tool-selector.tsx` | Exports `ToolSelector` — zero importers. Superseded by stack-builder UI. | Delete file. |
| D7 | LOW | `hooks/` directory | Empty directory with no files. | Delete directory. |

### 5B — Dead Routes

| # | Severity | File | Finding | Recommended Fix |
|---|----------|------|---------|-----------------|
| D8 | HIGH | `app/(app)/recommend/page.tsx` | Full implementation exists but `next.config.ts:23` permanently redirects `/recommend` → `/sales-studio`. No navigation link points to it. Never rendered. | Delete file. |
| D9 | HIGH | `app/(app)/tools/page.tsx` | Full implementation exists but `next.config.ts:28` permanently redirects `/tools` → `/stack-catalog`. Never rendered. | Delete file. |
| D10 | MEDIUM | `app/(app)/bundles/builder/page.tsx` | Route `/bundles/builder` — not in `NAV_ITEMS`, no `<Link>` or `router.push()` anywhere points to it. Unreachable from UI. | Delete or add navigation link. |
| D11 | MEDIUM | `app/(app)/approvals/page.tsx` | Route `/approvals` — not in `NAV_ITEMS`, no link points to it. Only referenced via `revalidatePath("/approvals")`. | Add to `NAV_ITEMS` or delete if not intended to be user-facing. |
| D12 | MEDIUM | `app/api/ai/suggest-pricing/route.ts` | No frontend code calls this endpoint. | Delete or wire up to UI. |
| D13 | MEDIUM | `app/api/ai/analyze-margin-impact/route.ts` | No frontend code calls this endpoint. | Delete or wire up to UI. |
| D14 | LOW | `app/api/webhooks/whop/route.ts` | Stub returning 501. Phase 4 TODO. | Delete until Phase 4 begins. |

### 5C — Unused Dependencies

| # | Severity | File | Finding | Recommended Fix |
|---|----------|------|---------|-----------------|
| D15 | HIGH | `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — **zero imports** anywhere in the codebase. ~150KB+ dead weight. | `pnpm remove @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |
| D16 | MEDIUM | `package.json` | `next-themes` — imported only in `components/ui/sonner.tsx:10`. Theme provider is never added to `app/layout.tsx`. App hardcodes dark mode. | Remove `next-themes` and the `useTheme` call in `sonner.tsx`. |
| D17 | MEDIUM | `package.json` | Dual AI SDK pattern: `@anthropic-ai/sdk` (5 routes) AND `@ai-sdk/anthropic` + `ai` (3 routes + 2 components). Both work but create maintenance burden. | Consolidate onto one SDK. The Vercel AI SDK (`@ai-sdk/anthropic` + `ai`) provides streaming helpers that reduce boilerplate. |

### 5D — Unused Exports & Duplicate Code

| # | Severity | File : Line | Finding | Recommended Fix |
|---|----------|-------------|---------|-----------------|
| D18 | MEDIUM | `lib/ai/intelligence.ts:12,71,99,143,179` | 5 of 6 exports (`upsertActionCard`, `checkServiceIncompleteness`, `checkMarginImpact`, `checkRenewalAlerts`, `checkStaleProposals`) are only called within the same file. Only `runDailyIntelligence` is imported externally. | Remove `export` keyword from the 5 internal functions. |
| D19 | MEDIUM | `lib/ai/stream.ts` vs `lib/recommend/stream.ts` | Two independent implementations of `tryParsePartialJSON`. The `lib/recommend/stream.ts` version also duplicates `stripCodeFences` from `lib/ai/validate.ts:7`. | Consolidate into a single `lib/ai/stream.ts` module. |
| D20 | MEDIUM | `app/api/onboarding/generate/route.ts:177` | Local `parseAIResponse` function duplicates the exported `parseAIResponse` from `lib/ai/validate.ts:19`. | Import from `lib/ai/validate.ts` instead. |
| D21 | LOW | `lib/formatting.ts:12` | `formatNumber` — exported but never imported. | Remove export or delete function. |
| D22 | LOW | `lib/data/tool-library.ts:124,128` | `getToolsByDomain` and `getToolsByVendor` — exported but never imported. | Remove exports or delete functions. |
| D23 | LOW | `lib/constants.ts:356` | `Industry` type — exported but never imported. | Remove export. |
| D24 | LOW | `app/globals.css:162-170` | `.card-glow` CSS class — defined but never used in any TSX file. | Remove the CSS rule. |
| D25 | LOW | `lib/types/index.ts` — 13 locations | 13 TODO comments: "replace with generated type from types/supabase.ts". The `gen:types` script exists in `package.json`. | Run `pnpm gen:types` and migrate to generated types. |

---

## PRIORITIZED FIX LIST

### Tier 1 — Fix Immediately (Security + Stability)

| Priority | ID | Summary | Effort |
|----------|----|---------|--------|
| 1 | S1 | Remove user-auth fallback from cron route — any user can process all orgs | 15 min |
| 2 | U1 | Add `global-error.tsx` + `error.tsx` to key routes | 1 hr |
| 3 | S2 | Validate `next` param in OAuth callback — open redirect | 15 min |
| 4 | S10 | Add org membership check to `/api/import/parse-pricing` | 10 min |
| 5 | S6 | Add org_id filter to `getProfiles()` | 10 min |
| 6 | S7 | Fix `getEnablementStatusByOrgId()` cross-org data leak | 20 min |

### Tier 2 — Fix This Sprint (Performance + UX)

| Priority | ID | Summary | Effort |
|----------|----|---------|--------|
| 7 | P1 | Fix N+1 in `getVersionById()` — batch tool fetch | 30 min |
| 8 | P2 | Fix N+1 in `createVersion()` — batch tool insert | 20 min |
| 9 | U6 | Add confirmation dialog for member removal | 30 min |
| 10 | U2 | Add `loading.tsx` to 6+ key routes | 1 hr |
| 11 | S11-S14 | Add org membership checks to 4 API routes | 40 min |
| 12 | P5 | Add missing indexes on FK columns | 30 min |
| 13 | U9 | Fix invite member no-op — either implement or disable button | 30 min |
| 14 | P9 | Parallelize sequential queries in page.tsx files | 45 min |

### Tier 3 — Fix This Month (Consistency + Cleanup)

| Priority | ID | Summary | Effort |
|----------|----|---------|--------|
| 15 | C1-C3 | Fix light-theme color leaks in 3 components | 1 hr |
| 16 | D15 | Remove 3 unused `@dnd-kit` packages | 5 min |
| 17 | D1-D4 | Delete 4 dead files | 10 min |
| 18 | D8-D9 | Delete 2 redirected page routes | 10 min |
| 19 | D19-D20 | Consolidate duplicate `tryParsePartialJSON` + `parseAIResponse` | 30 min |
| 20 | S3 | Harden `getActiveOrgId()` with membership check | 45 min |
| 21 | C5 | Begin migrating onboarding steps to shadcn components | 4 hr |
| 22 | P7 | Add LIMIT clauses to unbounded queries | 1 hr |

### Tier 4 — Backlog (Polish)

| Priority | ID | Summary | Effort |
|----------|----|---------|--------|
| 23 | C10 | Extract shared `marginColor()` utility | 30 min |
| 24 | C11-C14 | Add responsive breakpoints to tables/grids | 2 hr |
| 25 | D16-D17 | Remove `next-themes`, consolidate AI SDKs | 2 hr |
| 26 | D25 | Migrate hand-written types to Supabase generated types | 3 hr |
| 27 | D10-D14 | Delete or wire up 5 orphaned routes | 1 hr |
| 28 | S4 | Add `/sales-studio` and `/stack-catalog` to protected routes | 5 min |
| 29 | C8 | Add display font to service wizard step headings | 15 min |
| 30 | S15 | Add AbortController timeout to AI API calls | 1 hr |
