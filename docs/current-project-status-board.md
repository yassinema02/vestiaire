# Vestiaire Current Project Status Board

**Document Version:** 1.0  
**Date:** 2026-03-08  
**Prepared By:** Mary, Business Analyst  
**Purpose:** Summarize the current state of the Vestiaire codebase by feature area and engineering readiness, using the categories `Done`, `Partial`, `Not Ready`, `Immediate Fixes`, and `Post-Launch Hardening`.

---

## 1. Executive Summary

Vestiaire is already a broad and materially built product. The main challenge is no longer feature absence. The main challenge is production hardening.

The codebase currently supports:

- wardrobe management
- AI-assisted outfit and item flows
- analytics and gamification
- resale/circularity flows
- social and OOTD surfaces
- shopping assistant flows
- travel, wishlist, and calendar-related features

What remains is concentrated in:

- AI security and provider boundaries
- test and CI reliability
- notification and premium realism
- release/config cleanup
- modularization of oversized screens and services

---

## 2. Done

### Platform Foundation

- Monorepo structure is established.
- Expo mobile app is in place.
- Shared package exists.
- Supabase backend, migrations, and Edge Functions exist.

### Product Surface Exists

- Authentication routes exist.
- Onboarding and profile setup exist.
- Wardrobe flows exist.
- Outfit flows exist.
- Analytics exists.
- Social, shopping, resale, travel, wishlist, calendar, and premium surfaces all exist in the app.

### Baseline Build Health

- Root `npm run typecheck` currently passes.

### Strategic Coherence

- The product direction is coherent around wardrobe digitization, styling assistance, usage intelligence, and adjacent engagement/commercial loops.

---

## 3. Partial

### Auth, Onboarding, and Profile

**Status:** Partial

What is true now:

- Auth and onboarding are clearly implemented.
- Profile/settings are feature-rich.

Why not done:

- The profile area is very large and operationally central.
- Release configuration and auth/config drift still create risk.

Key files:

- `apps/mobile/app/(auth)/`
- `apps/mobile/app/onboarding.tsx`
- `apps/mobile/app/profile-setup.tsx`
- `apps/mobile/app/(tabs)/profile.tsx`

### Wardrobe Management

**Status:** Partial

What is true now:

- Item creation, browsing, filtering, and detail flows are present.
- The wardrobe experience is a real core feature, not a placeholder.

Why not done:

- It still sits inside a codebase with unstable quality gates.
- Large screen and service complexity increase regression risk.

Key files:

- `apps/mobile/app/(tabs)/wardrobe.tsx`
- `apps/mobile/app/(tabs)/add.tsx`
- `apps/mobile/app/(tabs)/confirm-item.tsx`
- `apps/mobile/app/(tabs)/item-detail.tsx`
- `apps/mobile/services/items.ts`

### Outfit Engine and AI-Assisted Styling

**Status:** Partial

What is true now:

- AI-assisted outfit generation exists.
- Multiple styling/context flows exist.

Why not done:

- AI provider access is still partly client-side.
- Production-safe server boundary is incomplete.

Key files:

- `apps/mobile/services/aiOutfitService.ts`
- `apps/mobile/services/aiUsageLogger.ts`
- `apps/mobile/services/contextService.ts`

### Analytics, Gamification, and Resale

**Status:** Partial

What is true now:

- These systems are present and substantial.
- They appear to be part of the actual product, not speculative roadmap only.

Why not done:

- Stability and trust are limited by failing tests and oversized implementation surfaces.
- Some related premium/usage behaviors still need enforcement hardening.

Key files:

- `apps/mobile/app/(tabs)/analytics.tsx`
- `apps/mobile/services/analyticsService.ts`
- `apps/mobile/services/gamificationService.ts`
- `apps/mobile/services/listingService.ts`
- `apps/mobile/services/resaleService.ts`

### Social, OOTD, and Squads

**Status:** Partial

What is true now:

- Social routes and services exist.
- OOTD and squad concepts are implemented in the repo.

Why not done:

- The codebase does not yet show enough operational confidence to treat these flows as fully hardened.
- Current test instability reduces confidence in the supporting service layer.

Key files:

- `apps/mobile/app/(tabs)/social.tsx`
- `apps/mobile/app/(tabs)/create-ootd.tsx`
- `apps/mobile/app/(tabs)/create-squad.tsx`
- `apps/mobile/app/(tabs)/join-squad.tsx`
- `apps/mobile/app/(tabs)/squad-detail.tsx`
- `apps/mobile/services/ootdService.ts`
- `apps/mobile/services/squadService.ts`

### Shopping Assistant and Scan Flows

**Status:** Partial

What is true now:

- Shopping analysis and scan-related routes exist.
- The feature surface is already part of the app.

Why not done:

- The AI architecture is not yet production-safe.
- The service explicitly notes deferred Edge Function migration.

Key files:

- `apps/mobile/app/(tabs)/shopping.tsx`
- `apps/mobile/app/(tabs)/scan-confirm.tsx`
- `apps/mobile/app/(tabs)/scan-history.tsx`
- `apps/mobile/app/(tabs)/scan-results.tsx`
- `apps/mobile/services/shoppingService.ts`

### Travel, Wishlist, Calendar, and Secondary Loops

**Status:** Partial

What is true now:

- These features exist and are part of the real product surface.

Why not done:

- They are secondary compared with the core wardrobe journey.
- They have less evidence of stabilization than the main flows.

Key files:

- `apps/mobile/app/(tabs)/travel.tsx`
- `apps/mobile/app/(tabs)/wishlist.tsx`
- `apps/mobile/app/(tabs)/events.tsx`
- `apps/mobile/app/(tabs)/calendar-settings.tsx`
- `apps/mobile/app/(tabs)/wear-calendar.tsx`
- `apps/mobile/services/calendar.ts`
- `apps/mobile/services/eventSyncService.ts`
- `apps/mobile/services/tripPackingService.ts`

### Documentation and Architecture Alignment

**Status:** Partial

What is true now:

- The repo now has improved current/target planning docs.

Why not done:

- Some legacy architecture documentation still reflects aspirational tooling rather than consistent implementation reality.

Key files:

- `docs/architecture.md`
- `docs/current-architecture.md`
- `docs/target-architecture.md`
- `docs/launch-scope.md`

---

## 4. Not Ready

### Notifications and Reminder Systems

**Status:** Not Ready

Reason:

- Multiple notification-related services are explicitly stubbed for Expo Go / development-build limitations.
- Public reminder behavior is not yet production-real.

Key files:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/services/eveningReminderService.ts`
- `apps/mobile/services/ootdReminderService.ts`
- `apps/mobile/services/eventReminderService.ts`
- `apps/mobile/services/outfitNotificationService.ts`
- `apps/mobile/services/extractionNotificationService.ts`
- `apps/mobile/services/ootdNotificationService.ts`

### Premium Billing

**Status:** Not Ready

Reason:

- Subscription purchase and restore behavior is still simulated.

Key file:

- `apps/mobile/services/subscriptionService.ts`

### Test Pipeline

**Status:** Not Ready

Reason:

- Root `npm test` is misconfigured.
- App-level Jest currently fails at a level too high to be trusted as a merge gate.

Current validation state:

- `npm run typecheck`: passing
- root `npm test`: failing
- `apps/mobile` Jest: 25 failed suites, 9 passed suites, 91 failed tests, 315 passed tests

Key files:

- `package.json`
- `apps/mobile/jest.config.js`
- `apps/mobile/__tests__/`

### AI Security Boundary

**Status:** Not Ready

Reason:

- Client-side provider access still exists.
- Public runtime config still exposes AI-related values.

Key files:

- `apps/mobile/app.config.js`
- `apps/mobile/services/runtimeConfig.ts`
- `apps/mobile/services/aiUsageLogger.ts`

---

## 5. Immediate Fixes

These are the next actions with the highest leverage.

### 1. Remove Client-Side AI/Provider Exposure

Actions:

- remove public Gemini config from client runtime
- audit every service using direct provider access
- route AI calls through Edge Functions

Files to start with:

- `apps/mobile/app.config.js`
- `apps/mobile/services/runtimeConfig.ts`
- `apps/mobile/services/aiUsageLogger.ts`
- `apps/mobile/services/aiOutfitService.ts`
- `apps/mobile/services/aiCategorization.ts`
- `apps/mobile/services/extractionService.ts`
- `apps/mobile/services/shoppingService.ts`
- `apps/mobile/services/listingService.ts`
- `apps/mobile/services/backgroundRemoval.ts`
- `apps/mobile/services/stealLookService.ts`
- `apps/mobile/services/eventClassificationService.ts`
- `apps/mobile/services/gapAnalysisService.ts`
- `supabase/functions/ai-proxy/index.ts`
- `supabase/functions/analyze-product/index.ts`

### 2. Fix Root Test Wiring and Repair Test Environment

Actions:

- fix root Jest config resolution
- fix renderer/dependency mismatch
- fix Supabase and Expo runtime mocks
- bring the failing suites back to trustworthy status

Files to start with:

- `package.json`
- `apps/mobile/jest.config.js`
- `apps/mobile/__tests__/`

### 3. Resolve Fake Production Behavior

Actions:

- finish notification implementation in native/dev builds or gate fake reminder paths
- implement real billing or ensure premium public UX does not misrepresent simulation

Files to start with:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/services/eveningReminderService.ts`
- `apps/mobile/services/ootdReminderService.ts`
- `apps/mobile/services/eventReminderService.ts`
- `apps/mobile/services/outfitNotificationService.ts`
- `apps/mobile/services/extractionNotificationService.ts`
- `apps/mobile/services/ootdNotificationService.ts`
- `apps/mobile/services/subscriptionService.ts`

### 4. Unify Config and Release Paths

Actions:

- choose one authoritative app config path
- clean up bootstrap/config drift
- standardize environment-specific values

Files to start with:

- `app.json`
- `apps/mobile/app.config.js`
- `apps/mobile/index.ts`
- `apps/mobile/App.tsx`
- `apps/mobile/app/(tabs)/profile.tsx`

---

## 6. Post-Launch Hardening

These items should remain on the roadmap even after launch stabilization begins.

### Frontend Modularization

Priority hotspots:

- `apps/mobile/app/(tabs)/analytics.tsx`
- `apps/mobile/app/(tabs)/profile.tsx`
- `apps/mobile/app/(tabs)/item-detail.tsx`
- `apps/mobile/services/shoppingService.ts`
- `apps/mobile/stores/extractionStore.ts`

### State and Cache Simplification

Actions:

- reduce hidden client caches
- standardize remote-state handling
- stop services from depending on global state where avoidable

### Server-Side Domain Consolidation

Actions:

- move more business-critical writes server-side
- increase Edge Function and RPC ownership over sensitive flows

### Observability and Operations

Actions:

- add production error tracking
- add feature and AI usage observability
- add release and rollback checklists

---

## 7. Priority Order

The recommended execution order is:

1. AI security boundary
2. Test and CI repair
3. Notifications and premium realism
4. Config and release-path unification
5. Core feature stabilization
6. Large-file modularization
7. Post-launch optimization and observability

---

## 8. Bottom-Line Assessment

Vestiaire is much closer to **launching a big app safely** than to **needing more major feature development**.

The remaining work is primarily:

- security hardening
- stability work
- release discipline
- architectural cleanup

That is a strong position for the project, but it also means the remaining work is concentrated in the hardest engineering layers rather than in easy visible wins.

