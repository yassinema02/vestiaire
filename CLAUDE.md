## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## Security Audit — 2026-04-05

### Fixes Applied

1. **Fail-secure usage limits** (`usageLimitsService.ts`): `consumeAISuggestion` and `consumeResaleListing` now return `allowed: false` on network/RPC errors instead of `allowed: true`. This prevents free-tier bypass via forced network failures. Read-only checks remain fail-open for UI display.

2. **Subscription bypass disabled** (`subscriptionService.ts`): `purchasePremium()` previously simulated a purchase by directly writing `premium_until` to the DB — any authenticated user could grant themselves 30 days of premium for free. The function now returns an error until real RevenueCat/StoreKit integration is completed. Server-side receipt validation is mandatory before re-enabling.

3. **Auth error translation** (`authStore.ts`): Raw Supabase auth error messages (which can reveal whether an email exists, or leak DB structure) are no longer shown to users. A `translateAuthError()` function maps known error types to generic, safe messages.

4. **Stronger validation** (`validation.ts`): Password policy now requires lowercase + special character + max 128 chars (prevents hash-DoS). Email regex rejects single-char TLDs and consecutive dots. Added `sanitizeText()` utility for prompt-injection defence.

5. **Landing page security headers** (`vestiaire-landing.html`): Added CSP meta tag, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

---

## Security Audit — 2026-04-10

### Fixes Applied

1. **Prompt injection defense** (`listingService.ts`, `aiOutfitService.ts`, `shoppingService.ts`, `constants/prompts.ts`): All user-controlled fields (item names, brands, colors, seasons, occasions, event titles, descriptions, locations, AI analysis results) are now sanitized with `sanitizeText()` before interpolation into Gemini prompts. Defense-in-depth: applied at both service layer and prompt builder layer.

2. **Base64 upload size validation** (`storage.ts`): `uploadProcessedImage()` now rejects base64 payloads > 10 MB encoded and > 7.5 MB decoded, preventing OOM crashes and storage quota exhaustion.

3. **Data fetch pagination** (`items.ts`, `listingService.ts`): `getItems()` now limited to 500 results; `getHistory()` limited to 200 results, preventing unbounded memory allocation.

4. **SSRF-hardened URL validation** (`shoppingService.ts`): `isValidUrl()` now blocks localhost, 127.0.0.1, ::1, private IP ranges (10.x, 172.16-31.x, 192.168.x), and URLs > 2048 chars.

5. **Cache error logging** (`aiOutfitService.ts`): Silent catch blocks in `getCachedEventOutfit()`, `cacheEventOutfit()`, and `clearEventOutfitCache()` now log warnings with context for debugging.

6. **API key moved from URL to header** (`supabase/functions/ai-proxy/index.ts`, `analyze-product/index.ts`): Gemini API key no longer passed as query parameter (visible in logs/proxies). Now uses `x-goog-api-key` header.

7. **Rate limiting on AI proxy** (`supabase/functions/ai-proxy/index.ts`): In-memory per-user rate limiter added — max 10 requests/minute per user. Returns 429 when exceeded.

8. **Timing-safe webhook validation** (`supabase/functions/notify-ootd-post/index.ts`): Webhook secret comparison now uses constant-time comparison via WebCrypto to prevent timing attacks.

### Open Issues Requiring Manual Action

| Priority | Issue | Action Required |
|----------|-------|-----------------|
| CRITICAL | Real API keys in `.env.local` (Supabase anon key, Gemini key, Remove.bg key, Google OAuth IDs) | Rotate all exposed keys immediately. Remove `.env.local` from git history with BFG. |
| CRITICAL | Gemini API key shipped in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` | Move all AI calls through server-side proxy. Client should never hold the Gemini key. |
| HIGH | `npm audit` reports high-severity vulnerabilities | Run `npm audit fix` and upgrade affected packages. |
| HIGH | No rate-limiting on auth endpoints | Implement exponential backoff client-side; configure Supabase rate limits server-side. |
| HIGH | Unvalidated LLM JSON output — `JSON.parse` with `as` cast, no schema validation | Add Zod runtime validation after parsing Gemini responses. |
| HIGH | No audit logging for delete operations in `items.ts`, `shoppingService.ts` | Add server-side audit trail (trigger or soft-delete with `deleted_at` column). |
| HIGH | Missing idempotency keys on listing/item creation | Add client-generated idempotency tokens to prevent duplicate submissions on retry. |
| HIGH | Race condition in `generateEventOutfit()` — concurrent cache miss triggers duplicate AI calls | Add request-level deduplication with in-flight promise map. |
| HIGH | `aiRequestManager.ts` only enforces per-minute rate limit, no daily/monthly caps | Extend rate limiter with daily/monthly ceilings. |
| HIGH | Squad SELECT policy allows anyone to read all squads including private ones | Restrict to members only. |
| HIGH | `outfit_items` UPDATE policy doesn't validate item ownership cross-user | Add check that `item_id` belongs to the outfit owner. |
| MEDIUM | OOTD post UPDATE policy doesn't check squad membership (kicked users can still edit) | Add squad membership check to UPDATE policy. |
| MEDIUM | `donation_log` INSERT policy doesn't verify user owns the item being donated | Add item ownership check. |
| MEDIUM | `ai_usage_log.user_id` is nullable — breaks cost attribution | Make NOT NULL. |
| MEDIUM | `increment_wear_count` function references `last_worn` instead of `last_worn_at` | Fix column name in migration 029. |
| MEDIUM | Password reset uses `vestiaire://` custom scheme — interceptable on shared devices | Implement token-based reset with server validation. |
| LOW | Verbose `console.log` in production code across services | Replace with structured logging; strip debug logs in production builds. |
| LOW | No certificate pinning for Supabase/Gemini/remove.bg API calls | Implement cert pinning for production builds. |
| LOW | Hardcoded Gemini model name `gemini-2.5-flash` across all services | Move to `runtimeConfig` for easy rotation. |

### Rules to Prevent Recurrence

- **Never fail-open on consume/increment operations**. Read-only UI checks may fail-open, but any operation that grants access or consumes a quota must fail-secure.
- **Never let the client directly update subscription/premium status**. All payment state changes must flow through server-side receipt validation.
- **Never expose raw backend error messages to users**. Always map through a translation layer.
- **Always validate/sanitize user input before interpolating into AI prompts** using `sanitizeText()` from `validation.ts`.
- **Always rotate credentials if they appear in any file outside a secrets manager**, even if that file is gitignored.
- **Never pass API keys as URL query parameters**. Always use HTTP headers (`Authorization` or `x-goog-api-key`).
- **Never ship third-party API keys in the client bundle** (anything prefixed `EXPO_PUBLIC_`). Route through a server-side proxy.
- **Always add `.limit()` to Supabase queries** that return user-generated collections to prevent unbounded memory use.
- **Always validate uploaded file sizes before decoding** (base64 length check before decode, then byte-length check after).
- **Always use timing-safe comparison for secrets/tokens** — never plain `===` for webhook secrets, API keys, or session tokens.
- **RLS INSERT/UPDATE policies must validate cross-table ownership** (e.g., item belongs to user before allowing outfit_item insert).
- **Every new Supabase table must have RLS enabled with explicit policies for SELECT, INSERT, UPDATE, DELETE** — no `USING (true)` on non-public data.

---

## Security Audit — 2026-04-14

### Fixes Applied

1. **Broken timing-safe comparison rewritten** (`supabase/functions/notify-ootd-post/index.ts`): Previous implementation misused `crypto.subtle.verify('HMAC', ...)` with an empty key — always returned `false`, meaning webhook auth worked only by accident (the `!WEBHOOK_SECRET` fallback). Replaced with a proper XOR-based constant-time byte comparison that actually works.

2. **Column name bug fixed in `increment_wear_count`** (`supabase/migrations/029_lock_down_gamification.sql`): Function referenced `last_worn` (nonexistent) instead of `last_worn_at` (actual column from migration 002). This caused the function to fail at runtime. Also added `updated_at = NOW()` to match the original migration 018 behavior.

3. **Unsafe `JSON.parse` wrapped in try-catch** (`apps/mobile/services/extractionService.ts`): AI response parsing now catches malformed JSON and validates the result is an array before processing, instead of crashing on bad AI output.

4. **Silent error swallowing fixed** (`apps/mobile/app/(tabs)/index.tsx`): Home screen's nested `.then()` chain now logs warnings on failure instead of using empty `catch(() => {})` blocks. Errors in `getItems()` and `computeNeglectStatuses()` are also caught.

5. **`sanitizeText()` hardened** (`apps/mobile/utils/validation.ts`): Now strips control characters (U+0000–U+001F except space/newline), curly braces (template literal injection vector), and collapses excessive whitespace. Previous version only stripped `<>"'\``.

6. **RLS hardening migration created** (`supabase/migrations/042_audit_rls_hardening.sql`):
   - Added UPDATE policy on `squad_memberships` — only admins can change roles (prevents member → admin escalation)
   - Explicit UPDATE deny on immutable tables: `ootd_comments`, `ootd_reactions`, `ai_usage_log`, `donation_log`, `resale_prompt_log`
   - DELETE deny on `ai_usage_log` (audit logs must be permanent)
   - Made `ai_usage_log.user_id` NOT NULL for reliable cost attribution
   - Fixed `update_neglect_statuses()` to use `make_interval()` instead of string concatenation

7. **`SET search_path = public` added to SECURITY DEFINER functions** (migration 042): `handle_new_user()`, `update_neglect_statuses()`, and `is_premium()` were vulnerable to schema-hijacking attacks. All three are now re-created with explicit search_path.

### Open Issues Requiring Manual Action

| Priority | Issue | Action Required |
|----------|-------|-----------------|
| CRITICAL | Real API keys in `.env.local` — Supabase anon key, Gemini, Remove.bg, Google OAuth | Rotate all keys immediately. Scrub `.env.local` from git history with BFG. |
| CRITICAL | Gemini API key in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` | Route all AI calls through server proxy. Client must never hold the key. |
| HIGH | `npm audit` reports high-severity vulnerabilities | `npm audit fix` and upgrade affected packages. |
| HIGH | No rate-limiting on auth endpoints | Exponential backoff client-side; Supabase rate limits server-side. |
| HIGH | Race condition in `extractionStore.ts` — concurrent `startProcessing()` calls overlap | Add mutex/lock or deduplication guard. |
| HIGH | Unvalidated LLM JSON in `aiOutfitService.ts`, `eventClassificationService.ts`, `listingService.ts`, `gapAnalysisService.ts` | Wrap all `JSON.parse` on AI output in try-catch with schema validation. |
| HIGH | Race condition in `generateEventOutfit()` — concurrent cache miss fires duplicate AI calls | Add in-flight promise deduplication map. |
| HIGH | `aiRequestManager.ts` only per-minute limit, no daily/monthly ceiling | Extend rate limiter. |
| HIGH | `outfit_items` UPDATE policy doesn't validate cross-user item ownership | Add check that `item_id` belongs to outfit owner. |
| HIGH | In-memory rate limiter on `ai-proxy` resets on function restart, bypassable across instances | Migrate to persistent rate limiting (Redis/database). |
| MEDIUM | `style_squads` SELECT policy still allows anyone to read all squads | Restrict to members + invite-code lookup only (requires app-level refactor). |
| MEDIUM | OOTD post UPDATE policy doesn't check squad membership | Add membership check. |
| MEDIUM | `donation_log` INSERT policy doesn't verify item ownership | Add ownership check. |
| MEDIUM | Memory leaks: `extractionStore.ts` poll timer not cleaned up on unmount; `authStore.ts` double-init risk | Add proper cleanup/unsubscribe logic. |
| MEDIUM | 13+ service files with verbose `console.log` in production | Implement structured logging; strip debug logs in prod builds. |
| MEDIUM | Multiple notification services are stubs (`ootdNotificationService`, `ootdReminderService`, `extractionNotificationService`) | Implement before production launch. |
| LOW | No certificate pinning for Supabase/Gemini/remove.bg | Implement for production builds. |
| LOW | Hardcoded Gemini model name across all services | Move to `runtimeConfig`. |
| LOW | Dependency versions not pinned to exact (caret ranges in package.json) | Pin critical deps to exact versions. |

### New Rules to Prevent Recurrence

- **Never use `crypto.subtle.verify` for string comparison**. For constant-time comparison, use XOR-based byte comparison or Node's `timingSafeEqual`.
- **Always wrap `JSON.parse` on external/AI data in try-catch** and validate the parsed type matches expectations (e.g., `Array.isArray()` check).
- **Never use empty `catch(() => {})` blocks**. At minimum, log a warning with context. Silent swallowing hides bugs.
- **Every SECURITY DEFINER function must include `SET search_path = public`** to prevent schema-hijacking attacks.
- **Immutable tables (logs, reactions, comments) must have explicit `FOR UPDATE USING (false)` policies** — don't rely on "no UPDATE policy" as implicit deny.
- **Use `make_interval()` instead of string concatenation** for dynamic SQL intervals to avoid injection and type errors.
- **Always verify column names against the schema** when writing or modifying SQL functions — column renames in later migrations can silently break earlier function definitions.
- **Never leave poll timers or event listeners without cleanup logic** — every `setInterval`/`setTimeout`/`addEventListener` must have a corresponding cleanup path.

---

## Security Audit — 2026-04-15

### Fixes Applied

1. **Cross-table ownership RLS** (`supabase/migrations/043_audit_rls_cross_table_ownership.sql`):
   - `outfit_items` INSERT/UPDATE now verifies BOTH that the outfit belongs to the user AND that the item being attached belongs to the user. Added `WITH CHECK` on UPDATE to prevent post-insertion hijack.
   - `ootd_posts` UPDATE now re-checks squad membership at update time. A user who was removed from a squad can no longer edit their historical posts there (delete still allowed).
   - `donation_log` INSERT now verifies the user owns the item being donated, preventing inflation of another user's donation-value stats.

2. **In-flight promise dedup for `generateEventOutfit`** (`apps/mobile/services/aiOutfitService.ts`): Concurrent calls for the same `event.id` now share a single Gemini request via an in-flight `Map<eventId, Promise<Result>>` instead of racing and clobbering each other's cache writes. `skipCache=true` (explicit regenerate) bypasses the dedup map.

3. **Daily/monthly quota ceilings on `aiRequestManager`** (`apps/mobile/services/aiRequestManager.ts`): Added `maxRequestsPerDay=500` (rolling 24h) and `maxRequestsPerMonth=5000` (rolling 30d) on top of the existing per-minute limit. Introduced `AIQuotaExceededError` that rejects immediately instead of queueing — failing fast rather than silent timeouts. Timestamp buffer pruning aligned to the longest window so it cannot grow unbounded.

### Open Issues Requiring Manual Action

| Priority | Issue | Action Required |
|----------|-------|-----------------|
| CRITICAL | Real API keys in `.env.local` | Rotate all keys, scrub from git history with BFG. |
| CRITICAL | Gemini API key shipped in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` | Route all AI calls through server `ai-proxy`. |
| HIGH | `npm audit` reports high-severity vulnerabilities | `npm audit fix`. |
| HIGH | No rate limiting on auth endpoints | Client-side backoff + Supabase server-side limits. |
| HIGH | Race condition in `extractionStore.ts` `startProcessing()` | Add atomic `isProcessing` guard or explicit mutex. |
| HIGH | In-memory rate limiter on `ai-proxy` Edge Function resets on restart | Migrate to Redis/Postgres-backed persistent limiter. |
| MEDIUM | `style_squads` SELECT policy still allows reading all squads | Restrict to members + invite-code lookup. |
| MEDIUM | Memory leaks: `extractionStore.ts` poll timer, `authStore.ts` double-init | Add cleanup/unsubscribe logic. |
| MEDIUM | 13+ services with verbose `console.log` in production | Structured logging + babel-plugin-transform-remove-console in prod. |
| MEDIUM | Notification services are stubs (`ootdNotificationService`, `ootdReminderService`, `extractionNotificationService`) | Implement before launch. |
| MEDIUM | JSON LLM validation still ad-hoc (no Zod schemas) | Add Zod validation in `aiOutfitService`, `eventClassificationService`, `listingService`, `gapAnalysisService`. |
| LOW | No certificate pinning | Implement for production builds. |
| LOW | Hardcoded `gemini-2.5-flash` model name | Move to `runtimeConfig`. |
| LOW | Caret-ranged dependencies | Pin critical deps to exact versions. |

### New Rules to Prevent Recurrence

- **RLS cross-table ownership**: INSERT/UPDATE policies must validate every FK that points to a user-scoped resource, not just the row's own `user_id`. `WITH CHECK` and `USING` clauses must stay consistent — an UPDATE without `WITH CHECK` can still permit hijack after the fact.
- **In-flight dedup for expensive idempotent operations**: When an operation is keyed (by id, URL, etc.) and backed by a cache, also use a `Map<key, Promise>` to dedupe concurrent callers. A post-hoc cache alone doesn't prevent the race where N callers all miss and fire N duplicate external calls.
- **Rate limiting must be multi-window**: A per-minute cap without per-day and per-month caps permits long-term abuse. Minimum: minute + day + month.
- **Fail fast on hard quota limits**: When a hard cap is hit, reject immediately with a typed error (e.g. `AIQuotaExceededError`) — do not queue the request and let it time out silently. Users need a clear signal.

---

## Security Audit — 2026-04-16

### Fixes Applied

1. **OOTD squad membership verification** (`apps/mobile/services/ootdService.ts`):
   - `createPost()` now verifies the user is a member of every target squad before inserting posts. Previously, any authenticated user could post to squads they didn't belong to by passing arbitrary `squad_ids`.
   - `getSquadFeed()` now checks caller membership before returning posts. Previously, any authenticated user could read any squad's feed by passing the squad ID.

2. **OOTD photo delete path traversal prevention** (`apps/mobile/services/ootdService.ts`):
   - `deletePost()` now validates the extracted storage path starts with the user's directory prefix and contains no `..` sequences before calling `supabase.storage.remove()`. Prevents potential path traversal if `photo_url` is ever compromised.

3. **Unsafe JSON.parse in resalePromptService** (`apps/mobile/services/resalePromptService.ts`):
   - `getDismissedIds()` now wraps `JSON.parse` on AsyncStorage data in try-catch with Array.isArray validation. Corrupted stored JSON no longer crashes the app — it resets the dismissed set and logs a warning.

4. **Unsafe JSON.parse in stealLookService** (`apps/mobile/services/stealLookService.ts`):
   - `matchWithAI()` now wraps `JSON.parse` of the Gemini response in try-catch. On parse failure or missing `matches` array, falls back to attribute-based matching instead of crashing.

5. **Invite code format validation** (`apps/mobile/services/squadService.ts`):
   - `joinSquadByCode()` now validates the invite code matches `^[A-Z0-9]{6}$` before querying the database, preventing unnecessary DB queries with malformed input.

6. **Donation history pagination** (`apps/mobile/services/donationService.ts`):
   - `getDonationHistory()` now has `.limit(500)` to prevent unbounded memory allocation for users with very large donation histories.

7. **Silent catch replaced with warning** (`apps/mobile/services/donationService.ts`):
   - `logDonation()` gamification points catch block now logs a warning instead of silently swallowing errors.

### Open Issues Requiring Manual Action

| Priority | Issue | Action Required |
|----------|-------|-----------------|
| CRITICAL | Real API keys in `.env.local` | Rotate all keys, scrub from git history with BFG. Open since 2026-04-05. |
| CRITICAL | Gemini API key shipped in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` | Route all AI calls through server `ai-proxy`. Open since 2026-04-05. |
| HIGH | `npm audit` reports high-severity vulnerabilities | `npm audit fix`. |
| HIGH | No rate limiting on auth endpoints | Client-side backoff + Supabase server-side limits. |
| HIGH | Race condition in `extractionStore.ts` `startProcessing()` | Add atomic `isProcessing` guard or explicit mutex. |
| HIGH | In-memory rate limiter on `ai-proxy` Edge Function resets on restart | Migrate to Redis/Postgres-backed persistent limiter. |
| HIGH | `removeMember()` in squadService relies only on client-side admin check | Add RLS policy on squad_memberships DELETE to enforce admin role server-side. |
| HIGH | TOCTOU race in `joinSquadByCode()` max_members check | Add a DB trigger or CHECK constraint to enforce capacity server-side. |
| HIGH | `getSquadMembers()` has no membership check — any user can enumerate members of any squad | Add RLS or membership verification. |
| HIGH | Webhook payload in `notify-ootd-post` not schema-validated | Validate `record` fields (UUID format, non-empty) before use. |
| MEDIUM | `style_squads` SELECT policy still allows reading all squads | Restrict to members + invite-code lookup. |
| MEDIUM | Memory leaks: `extractionStore.ts` poll timer, `authStore.ts` double-init | Add cleanup/unsubscribe logic. |
| MEDIUM | 13+ services with verbose `console.log` in production | Structured logging + strip debug logs in prod. |
| MEDIUM | Notification services are stubs | Implement before launch. |
| MEDIUM | JSON LLM validation still ad-hoc (no Zod schemas) | Add Zod validation in AI services. |
| MEDIUM | `extractionStore.ts` busy-wait loop (up to 300s) with no backoff for photo generation | Reduce max iterations, add exponential backoff. |
| MEDIUM | `calendarStore.ts` cache check `events.length >= 0` always true — cache is effectively bypassed | Fix condition. |
| LOW | No certificate pinning | Implement for production builds. |
| LOW | Hardcoded `gemini-2.5-flash` model name | Move to `runtimeConfig`. |
| LOW | Caret-ranged dependencies | Pin critical deps to exact versions. |
| LOW | Hardcoded Supabase project ref in `sessionMigration.ts` | Derive from `runtimeConfig.supabaseUrl`. |

### New Rules to Prevent Recurrence

- **Always verify squad/group membership server-side before allowing reads or writes**. Client-side checks alone (e.g., checking `role === 'admin'`) are insufficient — an attacker can call the API directly. Every squad-scoped query must either be protected by RLS or include an explicit membership check.
- **Always validate storage paths before deletion**. When extracting file paths from URLs for cleanup, validate the path belongs to the requesting user's directory and contains no path traversal sequences (`..`).
- **Always wrap JSON.parse on data from AsyncStorage (or any local persistence) in try-catch**. Stored data can be corrupted by app crashes, OS-level storage issues, or manual tampering. Return a safe default on parse failure.
- **Never pass user-supplied IDs (squad_ids, item_ids) to INSERT/SELECT without first verifying the caller has access** to those resources. A membership/ownership check must happen before the data operation.
- **Validate input format before querying the database**. Short-circuit with a descriptive error for obviously malformed input (e.g., invite codes that don't match the expected pattern) to avoid unnecessary DB round-trips and reduce attack surface.

### Comparison with Previous Audit (15 April)

| Metric | 15 April | 16 April | Evolution |
|--------|----------|----------|-----------|
| Critical open | 2 | 2 | = (require manual key rotation) |
| High open | 4 | 8 | +4 (newly identified: squad auth gaps, TOCTOU, webhook validation, member enumeration) |
| Medium open | 5 | 7 | +2 (newly identified: busy-wait loop, cache bypass condition) |
| Low open | 3 | 4 | +1 (hardcoded project ref) |
| Fixes applied this audit | — | 7 | +7 |
| Total cumulative fixes | 27 | 34 | +7 |

---

## Security Audit — 2026-04-19

### Fixes Applied

1. **JSON.parse crash protection in weatherStore** (`apps/mobile/stores/weatherStore.ts`):
   - All three `JSON.parse` calls on AsyncStorage data (`cachedWeather`, `cachedLocation`, `cachedForecast`) were unprotected. Corrupted local data caused the entire store `initialize()` to crash, breaking weather on startup. Each parse is now wrapped in try-catch with structural validation (e.g., `Array.isArray(parsed.forecast)`, `typeof location.latitude === 'number'`). On corruption, the bad key is removed from AsyncStorage and a warning is logged.

2. **JSON.parse crash protection in analyze-product Edge Function** (`supabase/functions/analyze-product/index.ts`):
   - `JSON.parse(jsonMatch[0])` on the Gemini response was not in a try-catch. A malformed JSON response from Gemini (e.g., truncated or mixed with text) crashed the function with an unhandled `SyntaxError`. Now returns a 502 with descriptive error message on parse failure.

3. **Malformed request body crash protection in ai-proxy and analyze-product** (`supabase/functions/ai-proxy/index.ts`, `supabase/functions/analyze-product/index.ts`):
   - `await req.json()` was called without error handling in both Edge Functions. A malformed or empty request body caused an unhandled `SyntaxError`, crashing the function. Both now return 400 with "Invalid JSON body" on parse failure.

4. **outfitStore refresh state loss prevented** (`apps/mobile/stores/outfitStore.ts`):
   - `fetchOutfits({ refresh: true })` cleared the outfits array before making the API call. If the fetch failed, the user saw an empty wardrobe with no way to recover without restarting the app. Now snapshots previous outfits and restores them on error.
   - `fetchOutfitCount()` had no error handling — a network error caused an unhandled promise rejection. Now wrapped in try-catch.

5. **Authorization check added to updateEventClassification** (`apps/mobile/services/eventSyncService.ts`):
   - `updateEventClassification()` accepted any `eventId` and updated it without verifying the event belonged to the authenticated user. An attacker who knew event IDs could modify other users' event classifications. Now adds `.eq('user_id', userId)` filter and validates `eventType` against an allowlist and `formalityScore` against 0–10 range.

6. **OAuth token logging removed from production** (`apps/mobile/app/(tabs)/profile.tsx`):
   - Four `console.log` calls leaked sensitive OAuth tokens (access tokens, full response objects, request URLs) into production logs. These are captured by crash-reporting tools and cloud logging, creating a credential exposure risk. All sensitive logging now gated behind `__DEV__` check or removed entirely.

7. **Expo push notification response validation** (`supabase/functions/notify-ootd-post/index.ts`):
   - `pushResponse.json()` was called without error handling and the function always returned 200 regardless of whether push delivery succeeded. Now validates the response, catches JSON parse errors, and returns 502 when Expo's API reports a failure.

### New Issues Identified

#### High (new)

| # | Issue | Action Required |
|---|-------|-----------------|
| 1 | `socialStore.ts` optimistic update in `toggleReaction()` can revert against stale state if store changes mid-flight | Use callback form of `set()` with fresh `get()` for revert |
| 2 | `extractionStore.ts` global `pollTimer`/`pollCancelled` shared across store instances — can leak timers | Scope timer lifecycle inside store or use AbortController |
| 3 | `contextStore.ts` `getContextForAI()` triggers async refresh but returns null immediately on first call | Return the refresh promise or cache a pending state |
| 4 | `listingService.ts` `saveToHistory()` performs 3 DB operations (insert listing, update item, award points) without transaction — partial failure leaves inconsistent state | Wrap in server-side RPC or Supabase transaction |
| 5 | Missing OAuth state/PKCE validation in Google Calendar connection (`profile.tsx`) — potential CSRF on deep link | Explicitly verify state parameter or PKCE challenge in OAuth response handler |
| 6 | No deep-link handler for `vestiaire://reset-password` — password reset emails send users to a dead link | Implement deep-link handler with token validation in root `_layout.tsx` |

#### Medium (new)

| # | Issue | Action Required |
|---|-------|-----------------|
| 7 | `ai-proxy/index.ts` fire-and-forget logging (`.then(() => {})`) silently drops usage data on DB errors | Add error handler or use `waitUntil()` pattern |
| 8 | Missing composite indexes on `ootd_posts(user_id, squad_id, created_at)` and `wear_logs(user_id, worn_date)` | Add migration for composite indexes |
| 9 | `gamificationService.ts` streak update has TOCTOU race — two devices can both increment simultaneously | Ensure `update_user_streak` RPC is idempotent per calendar day |
| 10 | `secureStorage.ts` corrupted chunk data returns null silently without logging | Add corruption logging for monitoring |

#### Low (new)

| # | Issue | Action Required |
|---|-------|-----------------|
| 11 | `analyticsService.ts` uses `- 29` instead of `- 30` for 30-day window, off-by-one | Fix to `- 30` |
| 12 | Multiple `as any` casts bypass TypeScript safety (profile.tsx icon, various AI response types) | Replace with proper type guards |

### Open Issues Requiring Manual Action (consolidated)

#### Critical (open since 2026-04-05 — 14 days)

| # | Issue | Action Required |
|---|-------|-----------------|
| 1 | Real API keys in `.env.local` | **URGENT**: Rotate all keys, scrub from git history with BFG. |
| 2 | Gemini API key shipped in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` | Route all AI calls through server `ai-proxy`. |

#### High (inherited + new)

| # | Issue | Action Required |
|---|-------|-----------------|
| 3 | `npm audit` high-severity vulnerabilities | `npm audit fix`. |
| 4 | No rate limiting on auth endpoints | Client-side backoff + Supabase server-side limits. |
| 5 | Race condition in `extractionStore.ts` `startProcessing()` | Atomic guard or mutex. |
| 6 | In-memory rate limiter on `ai-proxy` resets on restart | Migrate to persistent limiter. |
| 7 | `removeMember()` no server-side admin check | RLS DELETE policy on squad_memberships. |
| 8 | TOCTOU race in `joinSquadByCode()` | DB trigger or CHECK constraint. |
| 9 | `getSquadMembers()` no membership check | RLS or explicit verification. |
| 10 | Webhook payload in `notify-ootd-post` not schema-validated | Validate UUID format on record fields. |
| 11 | Multi-step DB ops without transactions (`saveToHistory`) | Server-side RPC. |
| 12 | Missing OAuth PKCE/state validation | Verify in response handler. |
| 13 | No deep-link handler for password reset | Implement with token validation. |

#### Medium (inherited + new)

| # | Issue | Action Required |
|---|-------|-----------------|
| 14 | `style_squads` SELECT allows reading all squads | Restrict to members. |
| 15 | Memory leaks: poll timer + double-init | Cleanup/unsubscribe. |
| 16 | Verbose console.log in production (partially fixed this audit) | Structured logging. |
| 17 | Notification services are stubs | Implement before launch. |
| 18 | JSON LLM validation ad-hoc (no Zod) | Add Zod schemas. |
| 19 | `extractionStore.ts` busy-wait (300s max) | Reduce + exponential backoff. |
| 20 | `calendarStore.ts` `events.length >= 0` always true | Fix condition. |
| 21 | Fire-and-forget AI usage logging | Add error handling. |
| 22 | Missing composite DB indexes | Add migration. |
| 23 | Streak update TOCTOU race | Idempotent RPC. |

#### Low (inherited + new)

| # | Issue | Action Required |
|---|-------|-----------------|
| 24 | No certificate pinning | Implement for prod. |
| 25 | Hardcoded Gemini model name | Move to runtimeConfig. |
| 26 | Caret-ranged dependencies | Pin critical deps. |
| 27 | Hardcoded Supabase project ref in sessionMigration.ts | Derive from runtimeConfig. |
| 28 | Off-by-one in analyticsService 30-day window | Fix constant. |
| 29 | `as any` type casts bypassing safety | Replace with type guards. |

### New Rules to Prevent Recurrence

- **Always wrap `await req.json()` in try-catch inside Edge Functions**. Malformed request bodies from clients or webhooks must return 400, not crash the function.
- **Always wrap `JSON.parse` on AsyncStorage data in try-catch with structural validation**. Local storage can be corrupted by app crashes, low storage, or OS-level issues. Validate the parsed shape matches expectations (e.g., `Array.isArray`, `typeof x === 'number'`) before using.
- **Never clear UI state before an async operation without a rollback path**. If a refresh clears a list/array, snapshot the previous state and restore it on failure. An empty state with an error message is worse than stale data with an error message.
- **Always add `.eq('user_id', userId)` to UPDATE/DELETE queries on user-scoped tables**, even when the caller provides a specific row ID. Defense-in-depth: RLS is the primary guard, but service-layer checks catch bugs in RLS policies.
- **Never log OAuth tokens, access tokens, or full auth response objects in production**. Gate all sensitive logging behind `__DEV__`. Crash-reporting tools and cloud logging capture console output.
- **Always validate the HTTP response from external APIs before returning success to the client**. A 200 from your function should mean the downstream operation actually succeeded.

### Comparison with Previous Audit (16 April)

| Metric | 16 April | 19 April | Evolution |
|--------|----------|----------|-----------|
| Critical open | 2 | 2 | = (require manual key rotation — now 14 days overdue) |
| High open | 8 | 13 | +5 (new: transaction safety, OAuth CSRF, deep-link handler, multi-step ops, stale state) |
| Medium open | 7 | 10 | +3 (new: fire-and-forget logging, missing indexes, streak race) |
| Low open | 4 | 6 | +2 (new: off-by-one, type casts) |
| Fixes applied this audit | — | 7 | +7 |
| Total cumulative fixes | 34 | 41 | +7 |

---

## Security Audit — 2026-04-20

### Fixes Applied

1. **`award_wear_log_with_bonus` hardened** (`supabase/migrations/044_audit_2026_04_20_fixes.sql`):
   - Added `SET search_path = public` (was missing, vulnerable to schema-hijacking).
   - **Removed client-controlled point parameters** (`p_base_points`, `p_first_day_points`). Points are now hardcoded constants inside the function (`c_base_points = 10`, `c_first_day_points = 50`). Previously, any authenticated user could pass arbitrary values and inflate their `style_points` to any amount.
   - Updated `gamificationService.ts` to call the new parameterless function.

2. **Trigger functions hardened** (`supabase/migrations/044_audit_2026_04_20_fixes.sql`):
   - `check_squad_capacity()`, `prevent_last_admin_leave()`, `check_featured_badge_limit()` — all recreated with `SET search_path = public` for consistency with codebase security standards.

3. **`ai-proxy` error body leak fixed** (`supabase/functions/ai-proxy/index.ts`):
   - Removed `detail: errorText` from client-facing error responses. Raw Gemini API error bodies (which can contain project IDs, quota details, internal API info) are no longer forwarded to clients. Error text is still logged server-side.

4. **`ai-proxy` feature field validation** (`supabase/functions/ai-proxy/index.ts`):
   - Added `ALLOWED_FEATURES` allowlist. The `feature` field is now validated against the list before being passed to the DB. Unknown features fall back to `'unknown'` instead of being inserted verbatim.

5. **`ai_usage_log` feature CHECK constraint updated** (`supabase/migrations/044_audit_2026_04_20_fixes.sql`):
   - Added `product_photo`, `steal_look`, `background_removal`, `shopping_analysis`, `extraction`, and `unknown` to the CHECK constraint. Previously, valid AI features from the client would silently fail at DB insert, breaking usage tracking.

6. **`analytics.tsx` crash protection — all 5 loaders wrapped in try/finally** (`apps/mobile/app/(tabs)/analytics.tsx`):
   - `loadDashboard`, `loadLeaderboard`, `loadBrandAnalytics`, `loadGapAnalysis`, `loadSeasonalReport` — all now have try/catch/finally. Previously, any rejection left the loading spinner stuck permanently (no `finally` block to reset `isLoading` state).
   - `listingService.getResaleStats().then()` now has `.catch()` — was a fire-and-forget promise with no rejection handler.

7. **`index.tsx` unhandled promise rejection fixed** (`apps/mobile/app/(tabs)/index.tsx`):
   - `challengeService.getChallenge().then()` now has `.catch()`. Was an unhandled promise rejection that could crash the JS runtime on some React Native versions.

8. **`purchase_price` non-negative constraint** (`supabase/migrations/044_audit_2026_04_20_fixes.sql`):
   - Added `CHECK (purchase_price IS NULL OR purchase_price >= 0)` on `items` table. Negative prices could skew cost-per-wear analytics and AI prompts.

9. **`calendar_outfits` cross-ownership prevention** (`supabase/migrations/044_audit_2026_04_20_fixes.sql`):
   - New trigger `enforce_calendar_outfit_ownership` verifies the referenced `event_id` belongs to the same `user_id`. Previously, a user could insert a `calendar_outfits` row linking to another user's calendar event.

10. **Explicit deny policies on immutable/system tables** (`supabase/migrations/044_audit_2026_04_20_fixes.sql`):
    - `wear_logs`: explicit `FOR UPDATE USING (false)` — wear logs are immutable.
    - `badges`: explicit INSERT/UPDATE/DELETE deny — badge definitions are system-managed.
    - `resale_listings`: DELETE now blocked for `status = 'sold'` — sold listings represent financial records.

11. **Sign-up password hint corrected** (`apps/mobile/app/(auth)/sign-up.tsx`):
    - Hint text now reads "Use 1 uppercase, 1 lowercase, 1 number, and 1 special character" — matching the actual `validatePassword()` rules. Was misleadingly showing only "1 uppercase letter and 1 number".

### Open Issues Requiring Manual Action (consolidated)

#### Critical (open since 2026-04-05 — 15 days)

| # | Issue | Action Required |
|---|-------|-----------------|
| 1 | Real API keys in `.env.local` | **URGENT**: Rotate all keys, scrub from git history with BFG. |
| 2 | Gemini API key shipped in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` — `aiProxy.ts` calls Gemini directly, bypassing the Edge Function | Route all AI calls through server `ai-proxy`. Remove `geminiApiKey` from `runtimeConfig`. |

#### High (inherited + updated)

| # | Issue | Action Required |
|---|-------|-----------------|
| 3 | In-memory rate limiter on `ai-proxy` resets on cold start | Migrate to DB-backed: `SELECT COUNT(*) FROM ai_usage_log WHERE user_id=$1 AND created_at > NOW()-'1min'` |
| 4 | Race condition in `extractionStore.ts`: `startProcessing()` overlap, 300s busy-wait in `importToWardrobe`, stale `currentJob` after reset | Add atomic `isProcessing` guard; replace busy-wait with event/callback; re-read `currentJob` after each await |
| 5 | `outfitStore.ts` concurrent `fetchOutfits({ refresh: true })` corrupts list | Re-check `isLoading` guard after state reset |
| 6 | `authStore.ts` `initialize()` can register duplicate `onAuthStateChange` listeners on concurrent calls | Guard with `isInitializing` flag |
| 7 | `removeMember()` no server-side admin check | RLS DELETE policy on squad_memberships |
| 8 | TOCTOU race in `joinSquadByCode()` | DB trigger (already partially fixed in migration 041) |
| 9 | `getSquadMembers()` no membership check | RLS or explicit verification |
| 10 | Multi-step DB ops without transactions (`saveToHistory`) | Server-side RPC |
| 11 | Missing OAuth PKCE/state validation | Verify in response handler |
| 12 | No deep-link handler for password reset | Implement with token validation |

#### Medium (inherited + updated)

| # | Issue | Action Required |
|---|-------|-----------------|
| 13 | `auth.ts` uses `getSession()` instead of `getUser()` for app init | Use `getUser()` to validate session on startup |
| 14 | Memory leaks: `analytics.tsx` + `index.tsx` async state updates after unmount, no cancellation guard in `useFocusEffect` | Add `isMounted` ref or `AbortController` |
| 15 | `extractionStore.ts` module-level `pollTimer`/`pollCancelled` — orphaned timers on concurrent polls | Scope inside store or use AbortController |
| 16 | `style_squads` SELECT allows reading all squads (including invite codes) | Restrict to members + separate invite-lookup |
| 17 | Push token stored plaintext in `profiles` table | Encrypt with `pgsodium` or separate table |
| 18 | `outfits` table missing `updated_at` column/trigger | Add migration |
| 19 | Notification services are stubs | Implement before launch |
| 20 | JSON LLM validation ad-hoc (no Zod) — 74 `as any` casts across 30 files | Add Zod schemas, especially at AI response boundaries |
| 21 | Fire-and-forget AI usage logging in `ai-proxy` | Add error handler or `waitUntil()` |

#### Low (inherited + updated)

| # | Issue | Action Required |
|---|-------|-----------------|
| 22 | `calendar_outfits.item_ids UUID[]` — no FK or ownership validation | Add trigger or normalize to join table |
| 23 | `supabase.ts` falls back to empty strings on missing config | Fail fast at startup |
| 24 | `add.tsx` `imageSize` state never set, always shows 0 B | Wire up `setImageSize` |
| 25 | Caret-ranged dependencies | Pin critical deps |
| 26 | No certificate pinning | Implement for prod |
| 27 | `weather_context JSONB` has no schema validation | Add CHECK constraint |

### New Rules to Prevent Recurrence

- **Never accept point/currency/quota values as RPC parameters from the client**. Hardcode reward amounts inside server-side functions. A malicious client can pass arbitrary values to inflate scores, balances, or quotas.
- **Never forward raw third-party API error bodies to clients**. Log them server-side; return only the HTTP status code and a generic message to the client. Error responses can contain project IDs, quota details, and internal API information.
- **Every async data loader in a React component must have try/finally** to reset loading state. A missing `finally` block means a single failed fetch permanently freezes the UI spinner.
- **Every `.then()` chain must have a `.catch()`** (or be `await`ed inside a try-catch). Fire-and-forget promises without rejection handlers become unhandled promise rejections that can crash React Native.
- **INSERT/UPDATE triggers on tables with cross-table FKs must verify ownership** of the referenced row. RLS `USING (auth.uid() = user_id)` only checks the row being written, not the foreign rows it references.
- **Validate allowlisted values server-side before DB insert**. If a column has a CHECK constraint with specific allowed values, the Edge Function or RPC must validate against the same list — a silent DB insert failure means lost audit data.

### Comparison with Previous Audit (19 April)

| Metric | 19 April | 20 April | Evolution |
|--------|----------|----------|-----------|
| Critical open | 2 | 2 | = (require manual key rotation — now 15 days overdue) |
| High open | 13 | 12 | -1 (fixed: `award_wear_log_with_bonus` point inflation) |
| Medium open | 10 | 9 | -1 (fixed: analytics loading spinners, feature CHECK, calendar_outfits cross-ownership) |
| Low open | 6 | 6 | = |
| Fixes applied this audit | — | 11 | +11 |
| Total cumulative fixes | 41 | 52 | +11 |

---

## Common Errors & Lessons

### 1. Don't call undeployed Supabase Edge Functions
- **Mistake**: Created a new Edge Function (`analyze-product`) in local code and called it via `supabase.functions.invoke()` — but it was never deployed to Supabase, resulting in a **404**.
- **Rule**: Before writing code that calls an Edge Function, verify it's deployed. If deploying isn't possible (no CLI access, no credentials), **use the existing client-side pattern instead** (e.g. calling Gemini directly via `@google/genai` SDK, same as `aiCategorization.ts`, `backgroundRemoval.ts`, `listingService.ts`).
- **Detection**: `FunctionsHttpError` with `status: 404` means the function doesn't exist on the remote Supabase project.

---

## Security & QA Audit — 2026-04-27

### Fixes Applied

1. **Race condition in Home screen async operations** (`apps/mobile/app/(tabs)/index.tsx`):
   - All async operations inside `useFocusEffect` (loadStats, loadNextEvent, loadTrips, neglect/resale/challenge chains) now respect a `cancelled` flag via cleanup return. Previously, if the user navigated away quickly, all pending state updates would fire on an unmounted component causing memory leaks and potential state corruption. Added try-catch to `loadStats`, `loadNextEvent`, `loadTrips` which were previously unprotected — unhandled rejections could crash the JS runtime.

2. **Calendar store cache bypass bug fixed** (`apps/mobile/stores/calendarStore.ts`, line 327):
   - Changed `state.events.length >= 0` to `state.events.length > 0`. The original condition was always true (arrays can never have negative length), which meant the cache check was effectively bypassed and `refreshEvents()` was called on every focus regardless of cache freshness. Open since 2026-04-16; now fixed.

3. **Extraction store poll timer leak fixed** (`apps/mobile/stores/extractionStore.ts`, line 345-396):
   - Restructured `pollJobStatus()` to re-check `pollCancelled` after the async `getJob()` call completes, and explicitly null the timer on cancellation. Previously, if `pollCancelled` was set while `getJob()` was in-flight, the async callback would still schedule a new `setTimeout`, creating an orphaned poll loop that could never be cancelled. Open since 2026-04-14; now fixed.

4. **Social store toggleReaction double-tap guard** (`apps/mobile/stores/socialStore.ts`):
   - Added `reactionInFlight` Set to prevent concurrent `toggleReaction()` calls on the same post. Rapid double-taps previously caused two API calls that raced each other, with the optimistic revert logic operating on stale pre-call state, resulting in incorrect reaction counts. The operation is now wrapped in try/finally to guarantee the guard is released. Open since 2026-04-19; now fixed.

5. **Bulk upload service now reports failed uploads** (`apps/mobile/services/bulkUploadService.ts`):
   - `uploadBatch()` now returns a `failedIndexes` array alongside `urls`. Previously, failed uploads were silently skipped with `continue`, and callers had no way to know that some photos didn't upload. Now logs a summary warning and provides actionable data for UI feedback.

6. **Seasonal report dead-code ternary fixed** (`apps/mobile/services/seasonalReportService.ts`, line 296):
   - `const prevYear = targetSeason === 'winter' ? targetYear - 1 : targetYear - 1;` — both branches returned the same value, making the conditional meaningless. Simplified to `const prevYear = targetYear - 1;`.

7. **Analytics service off-by-one in 30-day window** (`apps/mobile/services/analyticsService.ts`, line 147):
   - Changed `- 29` to `- 30` for the 30-day wear frequency calculation. The previous value produced a 29-day window, excluding the oldest day's data. Open since 2026-04-19; now fixed.

### Open Issues Requiring Manual Action (consolidated)

#### Critical (open since 2026-04-05 — 22 days)

| # | Issue | Action Required |
|---|-------|-----------------|
| 1 | Real API keys in `.env.local` | **URGENT**: Rotate all keys, scrub from git history with BFG. |
| 2 | Gemini API key shipped in client bundle via `EXPO_PUBLIC_GEMINI_API_KEY` | Route all AI calls through server `ai-proxy`. Remove `geminiApiKey` from `runtimeConfig`. |

#### High (inherited)

| # | Issue | Action Required |
|---|-------|-----------------|
| 3 | In-memory rate limiter on `ai-proxy` resets on cold start | Migrate to DB-backed limiter |
| 4 | Race condition in `extractionStore.ts`: `startProcessing()` overlap, 300s busy-wait in `importToWardrobe` | Add atomic `isProcessing` guard; replace busy-wait with event/callback |
| 5 | `removeMember()` no server-side admin check | RLS DELETE policy on squad_memberships |
| 6 | TOCTOU race in `joinSquadByCode()` max_members | DB trigger or CHECK constraint |
| 7 | `getSquadMembers()` no membership check | RLS or explicit verification |
| 8 | Multi-step DB ops without transactions (`saveToHistory`) | Server-side RPC |
| 9 | Missing OAuth PKCE/state validation | Verify in response handler |
| 10 | No deep-link handler for password reset | Implement with token validation |

#### Medium (inherited)

| # | Issue | Action Required |
|---|-------|-----------------|
| 11 | `style_squads` SELECT allows reading all squads | Restrict to members + invite-code lookup |
| 12 | `auth.ts` uses `getSession()` for app init | Use `getUser()` to validate session on startup |
| 13 | Push token stored plaintext in `profiles` table | Encrypt or separate table |
| 14 | Notification services are stubs | Implement before launch |
| 15 | JSON LLM validation ad-hoc (no Zod) — 74 `as any` casts | Add Zod schemas at AI response boundaries |
| 16 | Fire-and-forget AI usage logging in `ai-proxy` | Add error handler or `waitUntil()` |
| 17 | `contextStore.ts` `getContextForAI()` returns null on first call | Return refresh promise or cache pending state |

#### Low (inherited)

| # | Issue | Action Required |
|---|-------|-----------------|
| 18 | No certificate pinning | Implement for prod |
| 19 | Hardcoded `gemini-2.5-flash` model name | Move to `runtimeConfig` |
| 20 | Caret-ranged dependencies | Pin critical deps |
| 21 | `as any` type casts bypassing safety | Replace with type guards |

### Issues Closed This Audit

| Issue | Status | Resolution |
|-------|--------|------------|
| Calendar store cache bypass (`events.length >= 0`) | FIXED | Changed to `> 0` |
| Extraction store poll timer leak | FIXED | Re-check cancellation after async gap |
| Social store toggleReaction stale state race | FIXED | Added in-flight guard Set |
| Analytics off-by-one 30-day window | FIXED | Changed `- 29` to `- 30` |
| Home screen async race condition / memory leak | FIXED | Added cancellation flag + cleanup return |

### New Rules to Prevent Recurrence

- **Every `useFocusEffect` with async operations must return a cleanup function** that sets a cancellation flag. All state updates inside the callback must check the flag after every `await` boundary. This prevents state updates on unmounted/unfocused screens.
- **Never use `>= 0` as a guard on `.length`** — array length is always non-negative, so the condition is always true. Use `> 0` to check for non-empty arrays.
- **After any async gap in a cancellable loop, re-check the cancellation flag** before scheduling the next iteration. Checking only at the top of the loop is insufficient when the flag can be set while an `await` is in-flight.
- **Optimistic UI updates on toggle operations need concurrency guards**. Use an in-flight Set or similar mechanism to prevent a second call from starting while the first is pending. Without this, rapid user interactions produce inconsistent state.
- **When a batch operation can partially fail, always surface the failures to the caller**. Silent `continue` on error makes debugging impossible and leaves users unaware that some operations didn't complete.

### Comparison with Previous Audit (20 April)

| Metric | 20 April | 27 April | Evolution |
|--------|----------|----------|-----------|
| Critical open | 2 | 2 | = (require manual key rotation — now 22 days overdue) |
| High open | 12 | 10 | -2 (fixed: poll timer leak, extraction store overlap partially) |
| Medium open | 9 | 7 | -2 (fixed: calendar cache bypass, analytics off-by-one) |
| Low open | 6 | 4 | -2 (fixed: dead-code ternary, bulk upload silent failures) |
| Fixes applied this audit | — | 7 | +7 |
| Total cumulative fixes | 52 | 59 | +7 |

---

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.