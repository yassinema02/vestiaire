# Vestiaire Target Architecture

**Document Version:** 1.1  
**Date:** 2026-03-08  
**Status:** Phase 0 target-state direction  
**Purpose:** Define the architecture Vestiaire should move toward during the upgrade program without changing the core platform unnecessarily.

---

## 1. Target Summary

Vestiaire should remain on **Expo + React Native + TypeScript + Supabase**, but with stricter boundaries and stronger production discipline.

The target system should be:

> a mobile product with a thinner client, secure server-side AI integration, modular feature boundaries, and reliable release engineering, while still supporting the current feature surface.

This target intentionally avoids a platform rewrite.

---

## 2. Platform Decisions

### Keep

- Expo / React Native for the mobile client
- Expo Router for app navigation
- TypeScript across app, shared package, and functions
- Supabase for auth, Postgres, storage, and serverless backend capabilities

### Change

- move provider integrations off the client
- reduce direct client orchestration of business-critical workflows
- add reliable CI and release controls
- modularize frontend features and domain boundaries

### Avoid

- platform rewrites
- backend rewrites to a custom server before launch
- shipping additional major features before architecture stabilization

---

## 3. Target Frontend Architecture

### Desired Frontend Shape

```text
apps/mobile/
  app/                  route entry points only
  features/
    analytics/
    auth/
    extraction/
    outfits/
    profile/
    social/
    shopping/
    travel/
    wardrobe/
  services/
    api/
    device/
  stores/
    ui/
    workflow/
  components/
    ui/
    feature/
```

### Rules

- route files compose screens and call feature hooks
- business logic does not live in route files
- services are parameter-driven and do not pull from global state unless explicitly justified
- Zustand is limited to UI/workflow concerns
- remote data has one consistent fetch/cache/invalidation model

### Preferred Remote-State Direction

Adopt a dedicated server-state layer, preferably **TanStack Query**, for remote reads, invalidation, retries, and background refresh.

If that decision changes later, it must be replaced by another explicit standard. The current “mixed patterns” approach should not continue.

---

## 4. Target Backend Architecture

### Desired Backend Shape

- direct client access for simple user-scoped reads only
- Edge Functions or SQL/RPC boundaries for:
  - AI generation
  - product analysis
  - background-removal orchestration
  - premium or usage-limit enforcement
  - expensive or abuse-prone writes
  - any flow with business logic beyond ownership filtering

### Domain Ownership

Each major product area should have a clear backend boundary:

- wardrobe
- outfits
- analytics
- extraction
- shopping
- resale
- social
- subscriptions
- travel or event-related workflows where business rules exist

### Desired Backend Properties

- provider secrets never shipped to the client
- authenticated and validated requests
- server-side usage metering
- server-side rate limiting for AI and costly endpoints
- clear distinction between client reads and server-enforced writes

---

## 5. Target AI Architecture

### Target Pattern

1. Mobile client sends authenticated request to Supabase Edge Function.
2. Edge Function validates request shape and user context.
3. Edge Function calls provider.
4. Edge Function records usage, latency, and outcome.
5. Edge Function returns normalized domain response to mobile client.

### Benefits

- no exposed provider keys
- easier cost monitoring
- easier request validation
- easier provider switching later
- easier quota and abuse control

---

## 6. Target Release and Tooling Architecture

### Required State

- root `typecheck`, `test`, and `lint` all work
- CI enforces those checks on pull requests
- one canonical app config path
- one documented release path
- separate TS project boundaries for mobile app, shared package, and Edge Functions

### Nice to Add After Stabilization

- error tracking
- product analytics
- release checklist automation

---

## 7. Target Launch Product Shape

The target architecture should support launching the current product surface while making it safer and more supportable.

The operating rule is:

- keep implemented features
- harden risky features
- hide only flows that remain stubbed or simulated at release time

This means the architecture must be able to support:

- auth and onboarding
- wardrobe management
- outfit assistance
- wear logging
- analytics
- social/community surfaces
- shopping and scan flows
- travel, wishlist, and other secondary loops

The difference is not feature count. The difference is boundary discipline and production readiness.

---

## 8. Non-Goals for This Upgrade

The upgrade does **not** aim to:

- turn Vestiaire into a multi-platform web/mobile system before launch
- build a custom dedicated backend outside Supabase before launch
- support every existing route in the public launch with equal polish on day one
- preserve current architecture drift for convenience

---

## 9. Success Criteria

The target architecture is reached when:

- the mobile client is thinner and more modular
- provider integrations are server-side
- launch-visible flows are real, not stubbed
- docs match implementation
- release gates are green and repeatable
- launch scope is coherent and supportable
