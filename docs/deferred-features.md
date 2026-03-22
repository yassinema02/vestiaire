# Vestiaire Deferred Features

**Document Version:** 1.1  
**Date:** 2026-03-08  
**Status:** Phase 0 decision record  
**Purpose:** Record only the features or entry points that should be withheld from public launch if they remain fake, stubbed, or misleading.

---

## 1. Deferred for Public Launch

This list is intentionally narrow.

The following items are deferred from public launch only if they remain stubbed, simulated, or misleading at release time.

### Stubbed Notification Behavior

- push notification registration if still stubbed
- OOTD reminders if still stubbed
- event reminders if still stubbed
- extraction reminders if still stubbed
- notification settings that imply real scheduling when no real scheduling exists

### Simulated Monetization Behavior

- premium purchase flows if they still rely on simulated state changes
- restore/cancel flows tied to simulated premium state

### Any Other Misleading Public UX

- screens whose main value proposition is still placeholder-only
- feature entry points that knowingly route users into fake success states

---

## 2. Why These Items Are Deferred

These items are deferred for one or more of the following reasons:

- they depend on client-side AI/provider patterns that are not yet safe
- they include stubbed or simulated behavior
- they would misrepresent the actual product in a public launch

---

## 3. Conditions for Re-Entry

A deferred item can return to public release only if:

1. security and provider boundaries are already fixed
2. root quality gates are green and enforced
3. the user-facing success path is real
4. the feature does not reintroduce misleading behavior into public UX

---

## 4. Reassessment Order

Recommended reassessment order:

1. premium with real billing
2. notifications with native-build support

This is not a broad feature-cut list anymore. It is a guardrail against shipping fake behavior.
