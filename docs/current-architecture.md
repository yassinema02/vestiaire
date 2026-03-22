# Vestiaire Current Architecture

**Document Version:** 1.0  
**Date:** 2026-03-08  
**Status:** Current-state reference  
**Purpose:** Describe the architecture that exists in the repository today, without aspirational tooling or future-state assumptions.

---

## 1. System Summary

Vestiaire is currently a **mobile-first Expo/React Native app** backed by **Supabase** for auth, Postgres, storage, SQL functions, and Edge Functions.

The system is best described as:

> a feature-rich mobile prototype with real backend depth, but with too much client-side orchestration and several production-critical flows still unfinished.

---

## 2. Repository Structure

```text
vestiaire/
  apps/mobile/          Expo React Native application
  packages/shared/      shared constants and types
  supabase/             migrations and Edge Functions
  docs/                 architecture, PRD, launch, and planning docs
```

The repo uses npm workspaces and TypeScript project references.

---

## 3. Frontend Stack in Use

### Confirmed Current Technologies

- React 19
- React Native 0.81
- Expo SDK 54
- Expo Router
- TypeScript
- Zustand for client state
- `StyleSheet`-based styling
- Expo modules for camera, media, location, calendar, notifications, secure storage, and auth/session helpers

### Current Frontend Characteristics

- The app uses file-based routing under `apps/mobile/app`.
- Bottom-tab navigation is the primary app shell.
- A large amount of orchestration lives directly in route files.
- Services are used heavily and often act as domain logic plus integration layer.
- Some services read shared store state directly.
- AsyncStorage and secure storage are both used for local persistence.

### Current Frontend Risks

- multiple oversized screens
- mixed UI, data, and orchestration concerns
- inconsistent remote-state ownership
- hidden routes accumulating inside the tab layout

---

## 4. Backend Stack in Use

### Confirmed Current Technologies

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- SQL migrations
- Supabase Edge Functions
- Row Level Security and SQL/RPC enforcement for some sensitive operations

### Current Backend Characteristics

- There are dozens of schema migrations showing real domain evolution.
- Some important integrity rules already live in SQL/RPCs.
- Edge Functions exist, but only part of the intended server-side boundary has been implemented.
- The mobile client still performs too many direct writes and too many provider-driven workflows.

### Current Backend Risks

- provider integration and business logic split across client, SQL, and Edge Functions
- client remains the main application orchestrator for many feature flows
- launch-critical server-side boundary is incomplete

---

## 5. AI and External Integrations

### What Is Actually in Use

- Google Gemini via `@google/genai`
- weather integration
- calendar integration
- image optimization/background-related processing

### Current AI Pattern

- Some AI calls already have an Edge Function path.
- Multiple mobile services still call Gemini directly from the client.
- Public Expo config still exposes AI-related runtime values.

This is the most serious architecture/security issue in the current codebase.

---

## 6. App Configuration and Release State

### Current State

- `apps/mobile/app.config.js` is the main Expo configuration source.
- a root `app.json` still exists with overlapping app identity data
- `apps/mobile/index.ts` and `apps/mobile/App.tsx` suggest legacy bootstrap drift
- there is no confirmed EAS release configuration in the repo
- there is no visible GitHub Actions workflow in the repo

### Meaning

Release configuration is not yet unified into one clearly documented path.

---

## 7. Testing and Tooling State

### Current State

- unit/integration-style tests exist in `apps/mobile/__tests__`
- root `npm run typecheck` currently passes
- root `npm test` is misconfigured
- mobile Jest can run directly, but the suite is not currently trustworthy as a merge gate

### Meaning

The codebase has meaningful test intent, but quality gates are not yet operational.

---

## 8. Product Surface in the Current App

The current repo contains code for all of the following:

- authentication and onboarding
- wardrobe management
- AI categorization and outfit generation
- analytics
- wear logging
- calendar and weather context
- resale and circular prompts
- social/OOTD concepts
- squads/community concepts
- shopping assistant
- gamification
- premium
- reminders and notifications
- travel-related flows

The main problem is not missing ambition. The main problem is that too many of these surfaces are competing for launch readiness at once.

---

## 9. Summary Judgment

The current architecture is good enough to keep as a foundation:

- Expo + Supabase is still a reasonable platform choice.
- The monorepo shape is understandable.
- The app already contains real product and backend work.

The current architecture is not yet good enough to launch publicly without upgrade work because:

- AI/provider boundaries are insecure or incomplete
- documentation and implementation drift apart
- release/build/test gates are not stable
- frontend modules are too large and too coupled
- several user-visible flows are still stubbed or simulated

