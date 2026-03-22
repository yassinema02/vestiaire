# Vestiaire Codebase Upgrade Execution Plan

**Document Version:** 1.0  
**Date:** 2026-03-08  
**Scope:** Full repo upgrade for launch readiness, maintainability, and security  
**Primary Repo:** `vestiaire/`  
**Related Docs:** `docs/launch-optimization-audit-2026-03-07.md`, `docs/architecture.md`, `prd/security-fixing-implementation-plan.md`

---

## 1. Objective

Upgrade the Vestiaire codebase from a feature-rich prototype into a launchable product with:

- secure provider integrations
- reliable test and release gates
- smaller and maintainable frontend modules
- clearer server-side ownership of business logic
- documentation that matches the real system

This plan is intentionally sequenced. Work should be done in order. New features should be paused until Phases 1 through 5 are complete.

---

## 2. Current State Snapshot

Based on the March 7, 2026 audit and repo inspection:

- `npm run typecheck` passes at the repo root.
- Root `npm test` is misconfigured.
- Mobile Jest runs, but the suite is not healthy enough to trust as a merge gate.
- AI provider access is still partly handled client-side.
- Notifications are still stubbed in Expo Go-oriented flows.
- Premium billing is still simulated.
- Architecture docs describe tools and patterns that are not fully reflected in the codebase.
- Several key screens and services are too large to evolve safely.

This means the stack choice is still acceptable, but the architecture and delivery process need to be tightened before public launch.

---

## 3. Upgrade Principles

1. Fix production risks before refactoring for elegance.
2. Reduce scope before adding sophistication.
3. Move secrets, external providers, and business-critical writes server-side.
4. Make quality gates green before large structural changes.
5. Refactor by feature boundary, not file type alone.
6. Do not ship stubbed or simulated monetization/notification flows.
7. Keep one source of truth for current architecture and one for target architecture.

---

## 4. Workstreams

The upgrade is organized into six workstreams:

1. Product scope and documentation alignment
2. Security and configuration hardening
3. Quality gates and release engineering
4. Frontend modularization
5. Backend/domain consolidation
6. Launch cleanup and observability

These workstreams are executed through the ordered phases below.

---

## 5. Ordered Phases

## Phase 0 - Freeze Scope and Align Documentation

**Priority:** P0  
**Goal:** Establish a realistic launch surface and stop architecture drift.

### Tasks

1. Create a `Launch Scope` document listing exactly which flows are launch-critical.
2. Classify every major feature as one of:
   - launch
   - internal/beta only
   - deferred post-launch
3. Reconcile PRD and pitch materials with actual implementation status.
4. Replace the current architecture doc pattern with:
   - `current-architecture.md`
   - `target-architecture.md`
5. Add a `deferred-features.md` document for items intentionally removed from launch.

### Must Decide in This Phase

- Is premium part of launch, or hidden until real billing exists?
- Are social squad features part of launch, beta-only, or deferred?
- Are notifications part of launch, or hidden until device-build flows are complete?
- Is shopping assistant part of launch, or beta-only?

### Deliverables

- launch scope document
- current architecture document
- target architecture document
- deferred features list

### Exit Criteria

- Every feature has a launch status.
- Docs no longer overstate the current system.
- Team agrees to a scope freeze for all later phases.

---

## Phase 1 - Security and Configuration Hardening

**Priority:** P0  
**Goal:** Remove client-side provider risk and standardize runtime configuration.

### Tasks

1. Remove all public AI provider secrets from Expo config and runtime config.
2. Audit all mobile services for direct provider usage.
3. Route AI calls through Supabase Edge Functions or a small server-side boundary.
4. Add request validation and auth checks for every AI-facing function.
5. Add server-side rate limiting and usage tracking for AI-heavy endpoints.
6. Standardize environment variables by target:
   - local development
   - preview/test
   - production
7. Remove any Expo Go-only auth or redirect assumptions from release paths.

### Files to Tackle First

- `apps/mobile/app.config.js`
- `apps/mobile/services/runtimeConfig.ts`
- `apps/mobile/services/aiUsageLogger.ts`
- `apps/mobile/services/aiOutfitService.ts`
- `apps/mobile/services/extractionService.ts`
- `apps/mobile/services/shoppingService.ts`
- `apps/mobile/services/listingService.ts`
- `apps/mobile/services/backgroundRemoval.ts`
- `supabase/functions/ai-proxy/`
- `supabase/functions/analyze-product/`

### Deliverables

- no provider secrets in client runtime
- server-side AI boundary design
- environment variable matrix
- updated AI usage logging model

### Exit Criteria

- No mobile code calls Gemini or any external AI provider directly.
- Every AI request is authenticated and observable server-side.
- Config values are documented and build-target specific.

---

## Phase 2 - Quality Gates and Release Engineering

**Priority:** P0  
**Goal:** Make the repo safe to change.

### Tasks

1. Fix the root `npm test` script so it resolves the workspace config correctly.
2. Repair failing mobile tests in priority order:
   - broken config/dependency issues
   - incorrect mocks
   - stale expectations
   - real product regressions
3. Separate TypeScript project boundaries clearly for:
   - `apps/mobile`
   - `packages/shared`
   - `supabase/functions`
4. Add a repeatable repo-level `ci` command that runs:
   - typecheck
   - test
   - lint
5. Add CI workflows for pull requests and main branch.
6. Add one canonical release/build path and document it.
7. Add dependency pinning where version drift is currently breaking tests.

### Deliverables

- green root `npm test`
- green root `npm run typecheck`
- CI workflow files
- release/build instructions

### Exit Criteria

- A clean checkout can run the same validation commands locally and in CI.
- Test failures are actionable product failures, not tooling noise.
- Release prep no longer depends on tribal knowledge.

---

## Phase 3 - Remove or Finish Stubbed Launch Features

**Priority:** P0  
**Goal:** Eliminate fake or incomplete user-facing flows before structural refactors continue.

### Tasks

1. Finish real notification registration and scheduling in dev/native builds, or hide all notification settings from launch.
2. Replace simulated premium purchase flows with real billing, or remove premium from launch.
3. Audit all screens and settings pages for:
   - stubbed log messages
   - placeholder actions
   - fake success states
   - UI leading to unfinished routes
4. Add launch gating flags for unstable features that must remain in the codebase but not the public app.

### Files to Tackle First

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/services/eveningReminderService.ts`
- `apps/mobile/services/ootdReminderService.ts`
- `apps/mobile/services/eventReminderService.ts`
- `apps/mobile/services/outfitNotificationService.ts`
- `apps/mobile/services/extractionNotificationService.ts`
- `apps/mobile/services/subscriptionService.ts`

### Deliverables

- notification decision and implementation
- premium decision and implementation
- feature gating plan

### Exit Criteria

- No launch-visible feature relies on a stub.
- No paywall relies on simulated purchase state.
- Public navigation cannot reach unfinished flows.

---

## Phase 4 - Frontend Architecture Modularization

**Priority:** P1  
**Goal:** Reduce regression risk by breaking oversized screens and services into feature modules.

### Tasks

1. Define a feature-first frontend structure.
2. Move orchestration out of route files into hooks/controllers.
3. Restrict Zustand usage to:
   - ephemeral UI state
   - workflow state
   - small local preferences
4. Standardize how remote data is fetched, cached, retried, and invalidated.
5. Refactor the largest hotspots first.

### Hotspot Refactor Order

1. `apps/mobile/app/(tabs)/analytics.tsx`
2. `apps/mobile/app/(tabs)/profile.tsx`
3. `apps/mobile/app/(tabs)/item-detail.tsx`
4. `apps/mobile/services/shoppingService.ts`
5. `apps/mobile/stores/extractionStore.ts`
6. any route or service above roughly 500 lines after those

### Target Structure

```text
apps/mobile/
  features/
    analytics/
    extraction/
    outfits/
    profile/
    shopping/
    wardrobe/
  services/
    api/
    device/
  stores/
    ui/
```

### Rules for This Phase

- Screens compose UI and call feature hooks.
- Services are parameter-driven and do not reach into global state unless explicitly justified.
- Shared mapping/parsing logic moves out of screens.
- AsyncStorage usage must be cataloged and minimized.

### Deliverables

- feature module structure
- refactored hotspot files
- frontend architecture rules document

### Exit Criteria

- No critical route component is a monolith.
- Business logic is no longer concentrated in screen files.
- Store boundaries are clear and documented.

---

## Phase 5 - Backend and Domain Consolidation

**Priority:** P1  
**Goal:** Make the client thinner and move business-critical orchestration server-side.

### Tasks

1. Inventory all direct Supabase writes from mobile code.
2. Move business-critical writes behind RPCs or Edge Functions.
3. Keep direct client access only for simple user-scoped reads.
4. Define explicit domain boundaries for:
   - wardrobe
   - outfits
   - analytics
   - extraction
   - shopping
   - resale
   - subscriptions
5. Move expensive, abuse-prone, or multi-step flows to async jobs.
6. Review RLS and function auth coverage after the boundary shift.

### Candidate Flows to Move Server-Side

- AI outfit generation
- product analysis
- background removal orchestration
- listing generation
- social notifications
- premium state changes
- any write depending on business rules beyond simple ownership

### Deliverables

- backend boundary map
- new/updated Edge Functions and RPCs
- reduced client write surface

### Exit Criteria

- The client is no longer the main application server.
- Sensitive workflows are enforced server-side.
- Domain ownership is clear by module and by backend endpoint.

---

## Phase 6 - Data, State, and Cache Simplification

**Priority:** P1  
**Goal:** Reduce hidden state bugs and inconsistent data ownership.

### Tasks

1. Catalog all AsyncStorage keys and classify them as:
   - user preference
   - derived cache
   - workflow state
   - legacy data
2. Remove stale or duplicate caches.
3. Decide on one remote-state model:
   - adopt TanStack Query properly
   - or define a minimal internal pattern and document it
4. Stop services from pulling directly from stores when data can be passed explicitly.
5. Standardize loading, empty, error, and retry behavior across major flows.

### Deliverables

- state ownership matrix
- cache cleanup list
- remote-state strategy doc

### Exit Criteria

- Every persisted client key has a documented reason to exist.
- Remote data ownership is consistent.
- Feature behavior is less dependent on hidden local state.

---

## Phase 7 - Launch UX and Performance Pass

**Priority:** P1  
**Goal:** Polish the narrow launch journey after architecture risk is reduced.

### Launch Journey to Optimize

1. sign up / sign in
2. onboarding
3. add first items
4. browse wardrobe
5. generate an outfit
6. save, wear, and view analytics

### Tasks

1. Audit loading times and reduce needless refetching.
2. Improve empty states so the app feels useful with a small wardrobe.
3. Reduce first-session friction around item capture and organization.
4. Improve error messaging for AI failures, upload failures, and auth problems.
5. Validate route structure and hidden screens.
6. Do a focused accessibility and copy pass on the main journey.

### Deliverables

- launch UX punch list
- performance profiling notes
- prioritized polish backlog

### Exit Criteria

- The primary journey feels coherent and stable with real user data.
- There are no obvious dead ends or confusing empty states in launch flows.

---

## Phase 8 - Observability, Operations, and Demo Readiness

**Priority:** P2  
**Goal:** Make the app supportable after launch.

### Tasks

1. Add production error tracking.
2. Add analytics for:
   - activation
   - retention signals
   - AI usage and failure rates
   - conversion to premium if premium remains in scope
3. Add dashboards for AI latency and cost.
4. Add a release checklist and rollback checklist.
5. Add test/demo seed data for investor demos and QA regression passes.
6. Document operational ownership for major failures.

### Deliverables

- observability setup
- release checklist
- incident/rollback checklist
- demo dataset plan

### Exit Criteria

- Launch metrics are visible.
- Production failures are diagnosable.
- Demo and QA runs are reproducible.

---

## 6. Execution Order

Work strictly in this order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8

Allowed overlap:

- Phase 2 can begin during late Phase 1 for test/config work.
- Phase 4 can begin in parallel on a limited basis once Phase 2 gates are mostly stable.
- Phase 8 can start once Phases 5 through 7 are materially complete.

Not allowed:

- Shipping new V2 features before Phase 5.
- Launching with client-side AI secrets.
- Launching with fake billing or stubbed reminders exposed in UI.

---

## 7. Weekly Cadence Proposal

### Week 1

- Complete Phase 0
- Start Phase 1 secret/config removal

### Week 2

- Finish Phase 1
- Start Phase 2 quality gates

### Week 3

- Finish Phase 2
- Complete Phase 3 decisions and removals

### Week 4-5

- Execute Phase 4 frontend modularization

### Week 6-7

- Execute Phase 5 backend/domain consolidation
- Start Phase 6 state/cache simplification

### Week 8

- Finish Phase 6
- Execute Phase 7 launch UX/performance pass

### Week 9

- Execute Phase 8 observability and operations
- final launch readiness review

---

## 8. Definition of Done

The upgrade program is complete when all of the following are true:

- Launch scope is documented and reflected in the app.
- Current architecture docs match the real codebase.
- No provider secrets are shipped in the client.
- Root quality gates are green and enforced in CI.
- Stubbed launch-visible flows are removed or completed.
- Frontend hotspots are split into feature modules with clear ownership.
- Sensitive and business-critical workflows execute server-side.
- Client state and cache ownership are documented and simplified.
- The primary launch journey is stable and polished.
- Production errors, AI cost, and key business metrics are observable.

---

## 9. Immediate Starting Checklist

This is the exact order to begin work from this document:

1. Write `launch-scope.md`.
2. Write `current-architecture.md`.
3. Write `target-architecture.md`.
4. Remove client-side Gemini config from the mobile app.
5. inventory every direct AI/provider call in mobile code.
6. fix root `npm test`.
7. fix test dependency/config failures before touching large refactors.
8. decide notifications: real or hidden.
9. decide premium: real or hidden.
10. refactor the first hotspot: `apps/mobile/app/(tabs)/analytics.tsx`.

---

## 10. Notes for Execution

- Keep commits phase-scoped. Do not mix security work with broad UI refactors.
- Update this document after each phase with completion date and key decisions.
- If a later phase is blocked by an earlier one, resolve the blocker rather than working around it.
- If product scope changes again, update Phase 0 artifacts before continuing.

