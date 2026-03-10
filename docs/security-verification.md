# Security Verification Checklist

Post-migration verification for Stackteryx multi-tenant schema (migrations 001–014).

Each item includes a **positive test**, **expected result**, and **negative test** that should fail or return empty if security is working correctly.

All SQL is written for execution in the Supabase SQL Editor or via `psql`. Tests that require a specific user context use `set_config` to simulate JWT claims.

---

## Setup: Test Fixtures

Run this block once to create isolated test data. All verification queries reference these IDs.

```sql
-- Create two test orgs
INSERT INTO orgs (id, name, slug)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A (test)', 'test-org-a'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Org B (test)', 'test-org-b')
ON CONFLICT (slug) DO NOTHING;

-- Create two test users (must exist in auth.users first via Supabase dashboard)
-- Substitute real auth.users UUIDs below:
--   USER_A_ID = the UUID of a test user assigned to Org A
--   USER_B_ID = the UUID of a test user assigned to Org B
--   USER_NONE_ID = the UUID of a test user with NO org membership

-- Add User A to Org A
INSERT INTO org_members (org_id, user_id, role)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'USER_A_ID', 'member')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Add User B to Org B
INSERT INTO org_members (org_id, user_id, role)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002', 'USER_B_ID', 'member')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Seed a tool in Org A
INSERT INTO tools (id, org_id, name, vendor, category, is_active)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Test EDR', 'TestVendor', 'edr', true)
ON CONFLICT DO NOTHING;

-- Seed a client in Org A
INSERT INTO clients (id, org_id, name, industry, contact_name, contact_email, status)
VALUES ('cccccccc-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Test Client', 'finance', 'Jane', 'jane@test.com', 'active')
ON CONFLICT DO NOTHING;

-- Seed an org_vendor in Org B
INSERT INTO org_vendors (id, org_id, display_name)
VALUES ('dddddddd-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000002',
        'Org B Vendor')
ON CONFLICT DO NOTHING;
```

Helper to simulate a user's JWT context (run before each negative test):

```sql
-- Simulate User A's JWT
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_A_ID", "role": "authenticated"}', true);

-- Simulate User B's JWT
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_B_ID", "role": "authenticated"}', true);

-- Simulate user with no org membership
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_NONE_ID", "role": "authenticated"}', true);
```

---

## 1. RLS Deny-by-Default

**Goal:** No org-scoped table has a permissive "all authenticated users" policy. The only table with an `auth.uid() IS NOT NULL` SELECT policy is `vendors` (global catalog — intentional).

### Positive Test

```sql
-- List every SELECT policy that uses auth.role() = 'authenticated'
-- or auth.uid() IS NOT NULL, and verify none are on org-scoped tables.
SELECT
  schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE qual::text ILIKE '%authenticated%'
   OR qual::text ILIKE '%auth.uid()%IS NOT NULL%'
ORDER BY tablename;
```

**Expected result:** Only one row — `vendors` with policy `vendors_select`. No org-scoped tables (tools, bundles, clients, quotes, org_vendors, cost_models, etc.) should appear.

### Negative Test

```sql
-- As a user with NO org membership, attempt to read org-scoped tables.
-- Set JWT to USER_NONE_ID first.
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_NONE_ID", "role": "authenticated"}', true);

SELECT count(*) FROM tools;           -- Expected: 0
SELECT count(*) FROM bundles;         -- Expected: 0
SELECT count(*) FROM clients;         -- Expected: 0
SELECT count(*) FROM quotes;          -- Expected: 0
SELECT count(*) FROM org_vendors;     -- Expected: 0
SELECT count(*) FROM cost_models;     -- Expected: 0
SELECT count(*) FROM org_settings;    -- Expected: 0
SELECT count(*) FROM audit_log;       -- Expected: 0
```

**Expected result:** Every query returns `0`. RLS blocks all access because `get_user_org_ids()` returns an empty set for a user with no org membership.

---

## 2. Cross-Org Isolation

**Goal:** A user in Org A cannot see rows belonging to Org B, and vice versa.

### Positive Test

```sql
-- As User A, read tools — should only see Org A's tools.
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_A_ID", "role": "authenticated"}', true);

SELECT id, name, org_id FROM tools;
```

**Expected result:** Only rows where `org_id = 'aaaaaaaa-...-000000000001'` (Org A). The "Test EDR" tool should appear. No Org B rows.

### Negative Test

```sql
-- As User A, attempt to read Org B's org_vendor
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_A_ID", "role": "authenticated"}', true);

SELECT * FROM org_vendors
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000002';
-- Expected: 0 rows (Org B data invisible to User A)

SELECT * FROM clients
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000002';
-- Expected: 0 rows

SELECT * FROM cost_models
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000002';
-- Expected: 0 rows

-- As User A, attempt to read Org B's quotes
SELECT * FROM quotes
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000002';
-- Expected: 0 rows

-- As User A, attempt to INSERT a tool into Org B
INSERT INTO tools (org_id, name, vendor, category)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002',
        'Sneaky Tool', 'Evil', 'other');
-- Expected: ERROR — new row violates RLS policy
```

**Expected result:** All SELECTs return 0 rows. The INSERT raises an RLS policy violation error.

---

## 3. Quotes Immutability

**Goal:** The `quotes` table blocks UPDATE and DELETE at the trigger level, regardless of user role or service role.

### Positive Test

```sql
-- Insert a test quote (as User A, who is a member of Org A)
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_A_ID", "role": "authenticated"}', true);

-- First, ensure a bundle_version exists for Org A (substitute real IDs)
-- Then:
INSERT INTO quotes (org_id, client_id, bundle_version_id, customer_inputs, snapshot, created_by)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000001',
  'REAL_BUNDLE_VERSION_ID',  -- substitute a real bundle_version_id
  '{}',
  '{"cost": 0, "price": 0, "margin": 0, "line_items": []}',
  'USER_A_ID'
)
RETURNING id;
-- Expected: row inserted successfully, returns the new quote ID
```

### Negative Test — UPDATE

```sql
UPDATE quotes
SET snapshot = '{"tampered": true}'
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000001';
```

**Expected result:** `ERROR: quotes are immutable — UPDATE and DELETE are not permitted on this table`

### Negative Test — DELETE

```sql
DELETE FROM quotes
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000001';
```

**Expected result:** `ERROR: quotes are immutable — UPDATE and DELETE are not permitted on this table`

### Verify No UPDATE/DELETE RLS Policies Exist

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'quotes'
ORDER BY cmd;
```

**Expected result:** Only two rows: `quotes_select` (SELECT) and `quotes_insert` (INSERT). No UPDATE or DELETE policies.

---

## 4. audit_log Append-Only

**Goal:** The `audit_log` table blocks UPDATE and DELETE at the trigger level, even for service role.

### Positive Test

```sql
-- Confirm audit entries can be inserted
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_A_ID", "role": "authenticated"}', true);

SELECT count(*) FROM audit_log
WHERE org_id = 'aaaaaaaa-0000-0000-0000-000000000001';
-- Expected: >= 0 (any number; confirms SELECT works)
```

### Negative Test — UPDATE

```sql
-- Attempt to update an audit entry (even as service role / superuser)
UPDATE audit_log
SET action = 'tool_created'
WHERE id = (SELECT id FROM audit_log LIMIT 1);
```

**Expected result:** `ERROR: audit_log is append-only — UPDATE and DELETE are not permitted`

### Negative Test — DELETE

```sql
DELETE FROM audit_log
WHERE id = (SELECT id FROM audit_log LIMIT 1);
```

**Expected result:** `ERROR: audit_log is append-only — UPDATE and DELETE are not permitted`

### Verify Immutability Triggers Exist

```sql
SELECT tgname, tgtype, proname
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'audit_log'::regclass
  AND tgname IN ('audit_log_no_update', 'audit_log_no_delete');
```

**Expected result:** Two rows — `audit_log_no_update` and `audit_log_no_delete`, both pointing to `audit_log_immutability_guard`.

---

## 5. RPC Security

**Goal:** `calculate_bundle_margin` enforces org membership and input validation.

### Positive Test — Input Validation (null bundle_version_id)

```sql
SELECT calculate_bundle_margin(NULL, '{}'::jsonb);
```

**Expected result:** `ERROR: p_bundle_version_id is required`

### Positive Test — Input Validation (null customer_inputs)

```sql
SELECT calculate_bundle_margin(gen_random_uuid(), NULL);
```

**Expected result:** `ERROR: p_customer_inputs is required`

### Positive Test — Nonexistent Bundle Version

```sql
SELECT calculate_bundle_margin(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '{}'::jsonb
);
```

**Expected result:** `ERROR: bundle_version not found: ffffffff-ffff-ffff-ffff-ffffffffffff`

### Negative Test — Cross-Org Access Denied

```sql
-- As User B, attempt to price a bundle_version that belongs to Org A
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_B_ID", "role": "authenticated"}', true);

-- Substitute a real bundle_version_id belonging to Org A:
SELECT calculate_bundle_margin(
  'ORG_A_BUNDLE_VERSION_ID',
  '{}'::jsonb
);
```

**Expected result:** `ERROR: access denied`

The function is `SECURITY INVOKER` — it runs as the calling user, and `is_member_of(org_id)` returns false for User B on Org A's data.

---

## 6. org_settings Backfill

**Goal:** All rows from `workspace_settings` were correctly carried over to `org_settings` as JSONB.

### Positive Test

```sql
-- Compare row counts
SELECT
  (SELECT count(*) FROM workspace_settings) AS ws_count,
  (SELECT count(*) FROM org_settings)       AS os_count;
```

**Expected result:** Both counts are equal.

### Positive Test — Data Integrity

```sql
-- Verify the JSONB settings contain the expected keys from workspace_settings
SELECT
  os.org_id,
  os.settings ? 'workspace_name'              AS has_workspace_name,
  os.settings ? 'default_target_margin_pct'    AS has_margin,
  os.settings ? 'default_overhead_pct'         AS has_overhead,
  os.settings ? 'default_labor_pct'            AS has_labor,
  os.settings ? 'red_zone_margin_pct'          AS has_red_zone,
  os.settings ? 'max_discount_no_approval_pct' AS has_max_discount,
  os.settings ? 'onboarding_completed'         AS has_onboarding
FROM org_settings os;
```

**Expected result:** All `has_*` columns are `true` for every row.

### Positive Test — Value Match

```sql
-- Confirm a specific value matches between the two tables
SELECT
  ws.org_id,
  ws.default_target_margin_pct,
  (os.settings->>'default_target_margin_pct')::numeric AS os_margin
FROM workspace_settings ws
JOIN org_settings os ON os.org_id = ws.org_id;
```

**Expected result:** `default_target_margin_pct` matches `os_margin` for every row.

### Negative Test — workspace_settings Not Dropped

```sql
SELECT count(*) FROM workspace_settings;
```

**Expected result:** Returns a count (not an error). The table still exists and is intact.

---

## 7. Vendor Visibility

**Goal:** `vendors` is a global read-only catalog. Any authenticated user can SELECT, but no one can INSERT/UPDATE/DELETE via RLS.

### Positive Test — Authenticated Read

```sql
-- Any authenticated user (even with no org membership) can read vendors
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_NONE_ID", "role": "authenticated"}', true);

SELECT count(*) FROM vendors;
```

**Expected result:** Returns `>= 0` (no RLS error — the query succeeds).

### Negative Test — INSERT Blocked

```sql
SELECT set_config('request.jwt.claims',
  '{"sub": "USER_A_ID", "role": "authenticated"}', true);

INSERT INTO vendors (name) VALUES ('Rogue Vendor');
```

**Expected result:** `ERROR: new row violates row-level security policy for table "vendors"` — no INSERT policy exists.

### Negative Test — UPDATE Blocked

```sql
UPDATE vendors SET name = 'Hijacked' WHERE id = (SELECT id FROM vendors LIMIT 1);
```

**Expected result:** 0 rows updated (no UPDATE policy — silently filtered by RLS, or error depending on Postgres version).

### Negative Test — DELETE Blocked

```sql
DELETE FROM vendors WHERE id = (SELECT id FROM vendors LIMIT 1);
```

**Expected result:** 0 rows deleted (no DELETE policy — silently filtered by RLS).

### Verify Only SELECT Policy Exists

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'vendors';
```

**Expected result:** Exactly one row: `vendors_select` with `cmd = 'SELECT'`.

---

## 8. Type Coverage

**Goal:** `types/supabase.ts` can be generated and includes all tables from migrations 001–014.

### Positive Test — Generate Types

```bash
pnpm gen:types
```

**Expected result:** Command completes without error. File `types/supabase.ts` is created.

### Positive Test — Verify New Tables Present

```bash
# Check that the generated file includes all expected tables
grep -c 'quotes' types/supabase.ts         # Expected: >= 1
grep -c 'org_settings' types/supabase.ts   # Expected: >= 1
grep -c 'org_vendors' types/supabase.ts    # Expected: >= 1
grep -c 'cost_models' types/supabase.ts    # Expected: >= 1
grep -c 'cost_model_tiers' types/supabase.ts  # Expected: >= 1
grep -c 'org_vendor_discounts' types/supabase.ts  # Expected: >= 1
grep -c 'vendors' types/supabase.ts        # Expected: >= 1
grep -c 'audit_log' types/supabase.ts      # Expected: >= 1
grep -c 'labor_models' types/supabase.ts   # Expected: >= 1
```

### Positive Test — Verify RPC Function Present

```bash
grep -c 'calculate_bundle_margin' types/supabase.ts  # Expected: >= 1
```

### Verify Complete Table Coverage

```bash
# List all tables in the public schema and cross-check against the generated file
# Run in psql or SQL Editor:
```

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Cross-reference each table name against `types/supabase.ts`. The following tables should all be present:

| Table | Expected in types |
|-------|-------------------|
| approvals | Yes |
| audit_log | Yes |
| bundles | Yes |
| bundle_versions | Yes |
| bundle_version_tools | Yes |
| clients | Yes |
| client_contracts | Yes |
| cost_models | Yes |
| cost_model_tiers | Yes |
| entitlements | Yes |
| labor_models | Yes |
| org_members | Yes |
| org_settings | Yes |
| org_vendor_discounts | Yes |
| org_vendors | Yes |
| orgs | Yes |
| profiles | Yes |
| quotes | Yes |
| recommendation_history | Yes |
| scenarios | Yes |
| tools | Yes |
| vendors | Yes |
| workspace_settings | Yes |

### Negative Test — Missing Tables

```bash
# If any table from the list above is NOT found in types/supabase.ts,
# it means Supabase introspection missed it (possibly due to RLS blocking
# the type generator's access). Run:
for table in approvals audit_log bundles bundle_versions bundle_version_tools \
  clients client_contracts cost_models cost_model_tiers entitlements \
  labor_models org_members org_settings org_vendor_discounts org_vendors \
  orgs profiles quotes recommendation_history scenarios tools vendors \
  workspace_settings; do
  if ! grep -q "$table" types/supabase.ts 2>/dev/null; then
    echo "MISSING: $table"
  fi
done
```

**Expected result:** No output (no missing tables). If any table is printed, investigate whether its RLS policies block the type generator.

---

## Cleanup

After verification, remove test fixtures:

```sql
-- Remove in reverse dependency order
DELETE FROM org_members WHERE org_id IN (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002'
);
DELETE FROM tools WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
DELETE FROM clients WHERE id = 'cccccccc-0000-0000-0000-000000000001';
DELETE FROM org_vendors WHERE id = 'dddddddd-0000-0000-0000-000000000001';
DELETE FROM orgs WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002'
);
```
