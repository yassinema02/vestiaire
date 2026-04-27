# Vestiaire Launch Optimization Audit

Date: 2026-03-07

## Scope

This document is based on a repo-level audit of the current `vestiaire` codebase. I did not change application code. The goal is to identify the highest-leverage backend and frontend changes that would improve launch readiness, reduce architectural risk, and make the product easier to scale after launch.

## Repo Snapshot

- App source files: ~210 TypeScript/TSX files in `apps/mobile`
- Routed screens: 47 files under `apps/mobile/app`
- Services: 56 files under `apps/mobile/services`
- Components: 39 files under `apps/mobile/components`
- Zustand stores: 8 files under `apps/mobile/stores`
- Supabase migrations: 39 SQL files
- Supabase Edge Functions: 3
- Existing tests: 34 files under `apps/mobile/__tests__`

Notable size hotspots:

- `apps/mobile/app/(tabs)/analytics.tsx`: 2384 lines
- `apps/mobile/app/(tabs)/profile.tsx`: 1578 lines
- `apps/mobile/app/(tabs)/item-detail.tsx`: 1304 lines
- `apps/mobile/services/shoppingService.ts`: 896 lines
- `apps/mobile/app/(tabs)/plan-week.tsx`: 855 lines
- `apps/mobile/stores/extractionStore.ts`: 541 lines

## Executive Summary

Vestiaire already has a lot of product surface area: wardrobe management, AI categorization, AI outfit generation, analytics, resale, shopping assistant, social feed, calendar sync, travel, gamification, premium, and notifications. The main issue is not lack of features. The main issue is that the codebase is trying to launch too many partly-complete systems at once.

The highest-value recommendation is:

1. Keep the current stack for launch: Expo + Expo Router + Supabase is still a reasonable stack.
2. Rework the boundaries, not the platform: move business-critical logic and all provider integrations behind server-side functions, simplify the frontend into feature modules, and reduce launch scope.
3. Treat the current codebase as "feature-rich prototype approaching product" rather than "production launch-ready app."

If I had to summarize the current state in one sentence:

> Vestiaire is directionally well chosen, but it has too much client orchestration, too much architecture drift, and too many launch-critical flows that are still stubbed or only partially productionized.

## What Is Already Good

- The monorepo structure is simple and understandable.
- Supabase is a strong fit for an early-stage mobile product: auth, Postgres, storage, RLS, and serverless functions are enough for launch if used consistently.
- The database layer already includes useful security primitives:
  - RLS policies on core tables
  - server-side RPCs for sensitive operations like points, streaks, usage limits, and wear count
  - migration history that shows real domain evolution
- There is a meaningful test base around service logic.
- The product vision is coherent: digital wardrobe first, then intelligence, then commerce/social loops.
- Session storage has already been moved toward `expo-secure-store`, which is the right direction.

## Main Findings

### 1. The docs and the codebase no longer describe the same system

The repo has a major architecture-drift problem.

Examples:

- `README.md` and `docs/architecture.md` describe NativeWind, TanStack Query, OpenAI GPT-4o-mini, Upstash Redis, Sentry, GitHub Actions, Maestro, and EAS build setup.
- The actual app uses `StyleSheet`, Zustand, Gemini via `@google/genai`, no Redis integration, no Sentry integration, no workflow files in `.github/workflows`, no `eas.json`, and no E2E setup.

Why this matters:

- New work will keep compounding in the wrong direction if the team is optimizing for architecture that does not exist.
- Onboarding, debugging, and launch operations become slower because the "source of truth" is aspirational instead of real.

Recommendation:

- Update the architecture docs only after the backend/frontend boundaries are redefined.
- Maintain one "current architecture" document and one "target architecture" document, not one document that mixes both.

### 2. There are launch-blocking production gaps

These are not polish issues. They are release blockers.

#### 2.1 Client-side AI key exposure

Multiple mobile services still read `geminiApiKey` from Expo config and call Gemini directly from the app:

- `apps/mobile/services/aiUsageLogger.ts`
- `apps/mobile/services/aiOutfitService.ts`
- `apps/mobile/services/aiCategorization.ts`
- `apps/mobile/services/extractionService.ts`
- `apps/mobile/services/eventClassificationService.ts`
- `apps/mobile/services/gapAnalysisService.ts`
- `apps/mobile/services/shoppingService.ts`
- `apps/mobile/services/listingService.ts`
- `apps/mobile/services/backgroundRemoval.ts`
- `apps/mobile/services/stealLookService.ts`

This is the single biggest backend/security issue in the repo. The app already has an `ai-proxy` Edge Function, but the architecture is only partially migrated.

Recommendation:

- Remove all client-side provider keys from the mobile app before launch.
- Route every AI request through Supabase Edge Functions or a thin BFF layer.
- Add server-side rate limiting, usage metering, structured request validation, and provider failover logic there.

#### 2.2 Notifications are still stubbed

Several notification services explicitly say they are stubbed for Expo Go / development-build migration:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/services/eveningReminderService.ts`
- `apps/mobile/services/ootdReminderService.ts`
- `apps/mobile/services/eventReminderService.ts`
- `apps/mobile/services/ootdNotificationService.ts`
- `apps/mobile/services/outfitNotificationService.ts`
- `apps/mobile/services/extractionNotificationService.ts`

Recommendation:

- Either finish production notifications with real device builds and tested flows, or remove/hide all notification-related UI for launch.
- Do not ship reminder toggles that do not reliably schedule notifications.

#### 2.3 Premium billing is simulated

`apps/mobile/services/subscriptionService.ts` still simulates purchases by directly updating `profiles.premium_until`.

Recommendation:

- If subscriptions are part of launch, implement real billing with RevenueCat or native StoreKit-backed flows plus webhook reconciliation.
- If subscriptions are not part of launch, remove the paywall and premium surface from the public build.

#### 2.4 Build quality gates are not ready

Current findings:

- No root `npm test` script
- No visible CI workflow in `vestiaire/.github/workflows`
- No `eas.json`
- `npm run typecheck` currently fails

Typecheck currently fails because of:

- type drift between tests and domain types
- screen/service type mismatches
- Edge Functions being typechecked with the app TS config even though they need Deno-specific typing and project isolation

Recommendation:

- Add separate TS projects for:
  - `apps/mobile`
  - `packages/shared`
  - `supabase/functions`
- Make `lint`, `typecheck`, and `test` mandatory in CI before every merge.

#### 2.5 Release configuration is fragmented

There are multiple signs of bootstrap/config drift:

- `apps/mobile/package.json` points to `expo-router/entry`
- `apps/mobile/App.tsx` still exists as a standalone connection-test entry
- `apps/mobile/index.ts` still registers `App`
- root `app.json` and `apps/mobile/app.config.js` define overlapping app identity differently
- `apps/mobile/app/(tabs)/profile.tsx` hardcodes the Expo auth proxy redirect URI

Why this matters:

- OAuth and app identity issues often show up late, when release prep is already expensive.
- Fragmented config makes it harder to reason about what will actually be bundled and shipped.

Recommendation:

- keep exactly one authoritative app config path
- remove or isolate legacy bootstrap files
- replace hardcoded environment-specific OAuth values with environment-driven config per build target

### 3. The frontend architecture is doing too much work in screens

The current frontend shape is:

- big route components
- large services
- Zustand stores that often orchestrate workflows
- manual caching through AsyncStorage
- many direct calls across screens, stores, services, and Supabase

This has worked for speed, but it is now the biggest maintainability tax in the app.

#### Symptoms

- Many screens are 600 to 2300+ lines.
- Feature orchestration lives in route files instead of feature controllers/hooks.
- Data fetching happens in `useFocusEffect` blocks with multiple `Promise.all` branches.
- Screens often own both network orchestration and heavy derived UI state.
- Hidden tab routes have accumulated into the tab layout instead of being organized into feature stacks or route groups.

#### Why this hurts launch

- It increases regression risk in every high-traffic flow.
- It makes performance and loading bugs harder to reason about.
- It slows design/system cleanup because styling and behavior are deeply mixed.
- It makes product scope reduction hard because features are not modular enough.

### 4. The state model is inconsistent

The app uses Zustand heavily, but not with a clear rule for what belongs in a store versus a service versus a screen.

Examples of architectural leakage:

- Services reading global store state:
  - `apps/mobile/services/contextService.ts`
  - `apps/mobile/services/eventSyncService.ts`
  - `apps/mobile/services/aiOutfitService.ts`
- Many business caches live in AsyncStorage rather than in a server-state layer or backend:
  - weather
  - forecasts
  - onboarding state
  - gap analysis cache
  - trip packing lists
  - event sync cooldown
  - neglect thresholds
  - reminder preferences
  - notification preferences
  - seasonal report history
  - resale prompt dismissals

Recommendation:

- Use Zustand only for:
  - ephemeral UI state
  - wizard/workflow state
  - small device-local preferences
- Introduce TanStack Query or an equivalent server-state layer for:
  - remote reads
  - retries
  - invalidation
  - optimistic updates
  - background refresh
- Make services pure and parameter-driven. Do not let services reach into global stores.

### 5. The backend is too client-driven

The current architecture has strong database work, but too little server-side application logic.

Current shape:

- 39 migrations
- 3 Edge Functions
- 24 client files using `supabase.from`, `supabase.rpc`, `supabase.auth`, `supabase.storage`, or `supabase.functions`
- 65 direct Supabase calls from mobile layers

What this means:

- The database is doing some important enforcement.
- The client is still acting like the main application server for many domains.
- AI, scraping, provider calls, and business orchestration are split between device code, SQL RPCs, and a few edge functions.

That split is the wrong balance for launch.

Recommendation:

- Keep direct client access only for simple user-scoped reads where the logic is trivial.
- Move all writes with business rules, all AI calls, all external provider calls, and all potentially expensive or abuse-prone actions behind Edge Functions.

### 6. Product scope is too broad for a first launch

The codebase currently tries to support all of these in one public product:

- wardrobe ingestion
- AI categorization
- AI outfit generation
- wear logging
- analytics
- resale
- shopping assistant
- social/OOTD
- squads
- event sync
- trip packing
- notifications
- premium billing
- gamification

That is too much launch surface for the current architecture maturity.

Recommendation:

- Launch a narrower core.
- Treat social, shopping URL scraping, travel, advanced calendar sync, and premium billing as phase-2 or beta unless they are fully hardened.

## Recommended Launch Scope

### Keep for V1 public launch

- auth
- onboarding
- profile setup
- add item / wardrobe management
- AI categorization for items
- outfit suggestions
- wear logging
- item detail / favorites / editing
- lightweight analytics

### Keep only if fully hardened before launch

- resale listing generation
- premium
- calendar sync
- reminders/notifications

### Move to beta or post-launch

- social feed / squads / OOTD
- shopping assistant URL scraping
- trip packing
- advanced analytics modules
- heavy gamification loops
- multi-step extraction background pipeline

Reasoning:

- These features add operational complexity, not just UI complexity.
- Several of them depend on currently incomplete backend or release infrastructure.
- Launch success will be driven more by activation, first-wardrobe creation, first AI win, and 7-day retention than by breadth.

## Recommended Target Architecture

### 1. Backend direction: stay on Supabase, but add a real BFF layer

Do not migrate off Supabase before launch. That would add risk, not reduce it.

Instead, define a target backend shape like this:

- Supabase Auth for identity
- Postgres + RLS as the source of truth
- Storage for images
- Edge Functions as the application boundary for:
  - AI requests
  - listing generation
  - product analysis
  - calendar sync orchestration
  - notifications
  - billing webhook handling
  - any write flow with rules or audit needs

### Recommended backend rules

- All AI requests go through server-side functions.
- All external provider credentials live server-side.
- All writes with business rules must be idempotent.
- All critical side effects should be logged.
- Long-running work should become a job table + worker pattern, not a long client workflow.

### 2. Frontend direction: feature modules, thinner screens

Recommended frontend shape:

- route files stay thin
- each feature owns:
  - components
  - hooks/controllers
  - queries/mutations
  - types
  - utils
- cross-feature primitives move into shared packages

Example target structure:

```text
apps/mobile/
  app/
  src/
    features/
      auth/
      wardrobe/
      outfits/
      analytics/
      resale/
      calendar/
      social/
      shopping/
    ui/
      components/
      theme/
      tokens/
    lib/
      query/
      navigation/
      errors/
      analytics/
packages/
  shared/
    contracts/
    constants/
    utils/
  ui/
    mobile/
supabase/
  functions/
    ai-categorize-item/
    ai-generate-outfits/
    ai-generate-listing/
    analyze-product/
    sync-calendar/
    send-notifications/
    billing-webhook/
```

## Detailed Recommendations

### Backend Rework

#### A. Consolidate AI behind Edge Functions

Create server-side domain endpoints for:

- `ai-categorize-item`
- `ai-generate-outfits`
- `ai-generate-event-outfit`
- `ai-generate-listing`
- `shopping-analyze-product`
- `ai-gap-analysis`
- `ai-steal-look`

Each function should include:

- auth validation
- request schema validation
- rate limiting
- provider abstraction
- structured error mapping
- usage logging
- timeout and retry policy

#### B. Introduce a job model for extraction and other long workflows

The extraction pipeline is a good candidate for a proper job architecture:

- upload photos
- create extraction job
- server-side detection
- background removal
- result persistence
- progress updates

Recommended change:

- Keep `wardrobe_extraction_jobs`, but turn it into a state machine with explicit step status, error codes, retry counts, and idempotency.
- Move heavy orchestration out of the client store.

#### C. Make infrastructure reproducible

Several migrations mention manual bucket setup and dashboard steps. That is fine early, but bad for launch reproducibility.

Recommendation:

- codify bucket setup, storage policies, cron jobs, and webhook expectations in one environment bootstrap document
- keep "manual-only" setup to the smallest possible set

#### D. Reduce direct client writes

Good candidates for Edge Function mutation boundaries:

- premium and billing mutations
- listing creation/update/sold flows
- social posting flows
- notification dispatch
- calendar sync
- AI usage logging if it becomes sensitive or billable

#### E. Standardize contracts

The shared package is underused. Domain types are still duplicated or drifting between app code and DB-facing services.

Recommendation:

- create shared contract types for:
  - row shapes
  - API payloads
  - enum-like domain values
- validate all function inputs/outputs explicitly

### Database Rework

#### A. Keep the current RLS-first approach

This is one of the stronger parts of the codebase. Keep it.

#### B. Add stronger consistency around business events

Recommended additions:

- audit tables for sensitive actions:
  - billing state changes
  - notification sends
  - AI provider calls if billable
  - moderation/admin actions if social remains in scope
- explicit job/error tables where async work matters
- idempotency keys for webhook-backed or multi-tap-sensitive flows

#### C. Separate core product tables from experimental surfaces

For launch, the most stable data model is:

- profiles
- items
- outfits
- outfit_items
- wear_logs

Many other tables are valuable, but not all need to stay in the public surface for day one.

### Frontend Rework

#### A. Replace screen orchestration with feature controllers/hooks

For the large route files, split each screen into:

- `Screen.tsx`
- `useScreenController.ts`
- `components/*`
- `queries.ts`
- `mutations.ts`

Start with:

- analytics
- profile
- item detail
- plan week
- shopping
- wardrobe

#### B. Adopt a real server-state layer

This is the highest-ROI frontend architecture change.

Benefits:

- deduplicated fetches
- built-in stale/cache behavior
- fewer manual `useFocusEffect` fetch trees
- clearer mutation invalidation
- easier loading/error states

Use Zustand only where it is clearly the right tool:

- auth/session state
- multi-step extraction wizard state
- local UI preferences

#### C. Introduce a proper design system

The app currently has many independent `StyleSheet.create` blocks and large screens with embedded styling. That is workable, but not optimal for launch polish.

Recommendation:

- define tokens for:
  - color
  - spacing
  - radius
  - shadow
  - typography
- build shared primitives:
  - `Screen`
  - `Section`
  - `Card`
  - `Button`
  - `IconButton`
  - `Input`
  - `Chip`
  - `StatCard`
  - `EmptyState`
  - `ErrorState`
  - `LoadingState`

This matters because launch polish is often consistency, not visual complexity.

#### D. Simplify navigation

Current tab layout contains many hidden routes. That usually means the top-level nav is carrying too much responsibility.

Recommendation:

- reduce primary tabs to a smaller set
- move secondary detail flows into nested stacks or route groups
- keep top-level navigation aligned to the actual launch story

Suggested top-level tabs for launch:

- Home
- Wardrobe
- Add
- Outfits
- Profile

Everything else should sit behind those features, not compete with them.

#### E. Remove dead or conflicting app bootstrap/config surfaces

Examples of drift:

- `apps/mobile/App.tsx` still exists even though `apps/mobile/package.json` points to `expo-router/entry`
- `apps/mobile/index.ts` still registers `App`
- root `app.json` and `apps/mobile/app.config.js` define overlapping app config differently

Recommendation:

- remove or clearly isolate legacy scaffolding
- keep exactly one authoritative runtime configuration path

### Performance And Reliability

#### A. Stop doing expensive work on every focus without a cache strategy

Several large screens trigger multiple fetches and derived calculations on focus. This will become expensive as data grows.

Recommendation:

- fetch once through query hooks
- derive memoized display data close to the query layer
- move expensive calculations to backend views/RPCs where appropriate

#### B. Move expensive derived analytics server-side where it helps

Good candidates:

- leaderboard-style ranking
- aggregated analytics snapshots
- monthly resale summaries
- calendar summary views

#### C. Normalize image handling

Image-heavy flows are central to this product. Treat image processing as a first-class subsystem.

Recommendation:

- one upload pipeline
- one naming/path strategy
- one optimization strategy
- one retention/cleanup policy

### Testing, CI, And Release Engineering

#### A. Make the repo testable in one command

Add:

- root `test` script
- workspace test commands
- deterministic typecheck commands by project

#### B. Add CI immediately

Minimum required checks:

- install
- lint
- typecheck
- unit tests

Add EAS/TestFlight automation only after the base checks are green and stable.

#### C. Add crash and product observability

Before launch, add:

- Sentry or equivalent crash/error tracking
- product analytics for activation and retention
- server logs with request correlation IDs

Track at least:

- sign-up completion
- time to first item
- time to first AI categorization
- time to first outfit generation
- day-1/day-7 retention
- AI failure rate
- extraction failure rate
- sync failure rate

#### D. Add E2E coverage for only the flows that matter

Do not try to E2E everything.

Cover:

- auth
- onboarding
- add first item
- generate outfit
- log wear
- basic profile/settings

## Recommended Feature Decisions By Domain

### Wardrobe Core

Status: strongest launch candidate

Recommendation:

- make this the center of the launch
- optimize first-run item creation speed
- reduce friction in item editing and categorization

### Outfit AI

Status: high value, but backend boundary must be fixed

Recommendation:

- keep it in launch
- move inference server-side
- add better fallback behavior and analytics around failures

### Analytics

Status: useful, but currently oversized

Recommendation:

- keep a simplified analytics surface for launch
- defer the most advanced modules until usage data justifies them

### Resale

Status: promising, but depends on AI hardening and clearer lifecycle logic

Recommendation:

- keep only if it supports a tight, trustworthy flow
- otherwise position it as beta or post-launch

### Shopping Assistant

Status: high complexity and high fragility

Reasons:

- image analysis
- URL scraping
- domain-specific scraping brittleness
- compatibility scoring
- saved history/wishlist

Recommendation:

- do not make this a launch pillar unless it is a strategic differentiator
- if kept, launch screenshot analysis only and defer URL scraping

### Calendar / Travel

Status: useful but operationally expensive

Recommendation:

- if retained, narrow to read-only event awareness
- do not over-invest in sync-heavy or reminder-heavy flows before core retention is proven

### Social / OOTD / Squads

Status: highest moderation and lifecycle burden

Recommendation:

- keep out of the first public launch unless social is the core thesis
- if social is central, it needs:
  - moderation strategy
  - notification reliability
  - privacy controls
  - abuse handling
  - stronger observability

### Premium

Status: should not launch in simulated form

Recommendation:

- either finish billing properly or remove it from launch

## Highest-ROI Changes In Priority Order

1. Remove all client-side Gemini keys and move every AI call server-side.
2. Decide the real V1 launch scope and hide/defer beta-grade features.
3. Fix typecheck and split TypeScript projects so mobile and Deno functions are isolated.
4. Add CI for lint, typecheck, and tests.
5. Replace simulated billing with real billing or remove premium from launch.
6. Replace notification stubs with real builds or remove reminder/notification UI.
7. Add Sentry and product analytics.
8. Introduce a server-state layer and reduce `useFocusEffect` orchestration.
9. Split the 5 to 6 biggest screens into feature modules.
10. Build a small design system and simplify navigation.

## Proposed 6-Week Rework Plan

### Phase 0: Launch blockers and scope decisions

- remove client-side AI keys
- decide launch feature set
- disable or hide unfinished systems
- fix typecheck
- add CI
- add observability

### Phase 1: Backend hardening

- build the missing Edge Function layer for AI and sensitive writes
- introduce job/state-machine handling for extraction and similar async flows
- codify environment/bootstrap steps
- add function-level validation and rate limiting

### Phase 2: Frontend stabilization

- introduce server-state/query layer
- split large screens
- simplify navigation
- centralize UI primitives and tokens

### Phase 3: Launch polish

- real device QA
- TestFlight validation
- performance pass on image-heavy flows
- regression pass on core funnels

## What I Would Not Do Before Launch

- I would not migrate away from Supabase.
- I would not build a custom backend platform unless there is a hard compliance or scale requirement.
- I would not keep every current feature in the public launch build.
- I would not continue adding new AI features before fixing the AI platform boundary.
- I would not try to polish every screen equally; I would polish the core funnel disproportionately.

## Final Recommendation

Vestiaire does not need a full-stack rewrite before launch. It needs a boundary rewrite.

The most pragmatic path is:

- keep Expo + Supabase
- move AI and sensitive workflows server-side
- reduce public scope
- split the frontend by feature
- add real release discipline

If those changes are made, the product can launch on the current foundation. If they are not made, the likely outcome is a broad but brittle launch where support burden, AI cost exposure, and regression risk are all too high.
