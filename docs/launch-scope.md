# Vestiaire Launch Scope

**Document Version:** 1.1  
**Date:** 2026-03-08  
**Status:** Phase 0 baseline  
**Purpose:** Define the public launch surface for Vestiaire and remove ambiguity between implemented features, pitch claims, and stabilization work.

---

## 1. Launch Positioning

Vestiaire should launch with its **current feature set intact**, while aggressively hardening the parts that are insecure, stubbed, simulated, or operationally fragile.

The launch promise should be:

> Launch the product that already exists in the repo, then make it secure, stable, and scalable without stripping away the product ambition.

Phase 0 is therefore **not** a feature-cut exercise. It is a launch-alignment exercise:

- keep implemented features in the launch plan by default
- define the primary journey that must be polished first
- identify secondary features that still ship publicly
- identify only the flows that must be hidden if they remain stubbed or simulated at release time

---

## 2. Launch Decision Summary

### Included in Public Launch

- authentication
- onboarding
- profile setup and profile management
- wardrobe item creation, editing, browsing, filtering, and detail
- outfit generation, outfit browsing, and saved outfits
- wear logging
- wardrobe analytics
- gamification
- resale and circularity surfaces
- social and OOTD surfaces
- squad/community flows
- shopping assistant and scan flows
- wishlist
- travel and packing flows
- calendar and weather-aware experiences

### Public Launch, but Marked for Hardening

- bulk upload and extraction review flow
- calendar-aware outfit and event flows
- weather-aware outfit flows
- social/squad flows
- shopping assistant
- travel-related flows
- resale side-loops
- any feature that currently depends on insecure client-side AI/provider access

These remain public-launch scope, but they must be stabilized in later phases.

### Hide Only If Still Stubbed or Simulated at Release Time

- push notification reminders if still backed by Expo Go stubs
- notification settings that imply real scheduling when no real scheduling exists
- premium purchase flows if billing is still simulated
- any route whose core user promise is still fake, placeholder-only, or misleading

---

## 3. Primary Launch Journey

The public launch must optimize the following journey first:

1. Sign up or sign in
2. Complete onboarding and profile setup
3. Add first wardrobe items
4. Browse wardrobe
5. Generate or browse outfits
6. Save outfits and log wear
7. Review wardrobe analytics

This is the primary journey, not the full product boundary. Secondary features can still launch as long as they do not compromise stability.

---

## 4. Public Launch Screens

### Public Launch Screens

- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/verify-email.tsx`
- `app/onboarding.tsx`
- `app/profile-setup.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/wardrobe.tsx`
- `app/(tabs)/add.tsx`
- `app/(tabs)/confirm-item.tsx`
- `app/(tabs)/item-detail.tsx`
- `app/(tabs)/outfits.tsx`
- `app/(tabs)/outfits/builder.tsx`
- `app/(tabs)/outfits/detail.tsx`
- `app/(tabs)/outfits/swipe.tsx`
- `app/(tabs)/log-wear.tsx`
- `app/(tabs)/analytics.tsx`
- `app/(tabs)/badges.tsx`
- `app/(tabs)/bulk-upload.tsx`
- `app/(tabs)/calendar-settings.tsx`
- `app/(tabs)/create-ootd.tsx`
- `app/(tabs)/create-squad.tsx`
- `app/(tabs)/donation-history.tsx`
- `app/(tabs)/edit-profile.tsx`
- `app/(tabs)/events.tsx`
- `app/(tabs)/help.tsx`
- `app/(tabs)/listing-history.tsx`
- `app/(tabs)/notifications.tsx`
- `app/(tabs)/premium.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/review-items.tsx`
- `app/(tabs)/scan-confirm.tsx`
- `app/(tabs)/scan-history.tsx`
- `app/(tabs)/scan-results.tsx`
- `app/(tabs)/shopping.tsx`
- `app/(tabs)/social.tsx`
- `app/(tabs)/squad-detail.tsx`
- `app/(tabs)/join-squad.tsx`
- `app/(tabs)/steal-look.tsx`
- `app/(tabs)/travel.tsx`
- `app/(tabs)/wear-calendar.tsx`
- `app/(tabs)/wishlist.tsx`
- `app/(tabs)/privacy.tsx`

### Conditionally Hidden at Release Time

- notification-driven routes if reminders remain stubbed
- premium purchase entry points if billing remains simulated
- any screen whose core promise is still not real

---

## 5. Launch-Critical Capabilities

### Must Work Reliably

- auth session lifecycle
- secure profile loading
- item CRUD
- image upload/storage for wardrobe items
- outfit generation
- saved outfit persistence
- wear logging
- analytics loading
- app startup routing

### Must Be Stabilized If Kept Public

- social/community flows
- shopping/scan flows
- travel/packing flows
- extraction flows
- calendar/event flows
- resale side-loops

### Must Be Secure Before Launch

- all AI/provider calls
- any business-critical writes
- any usage limit enforcement
- any premium-related state if premium remains public

### Must Not Be Fake in Public Launch

- subscriptions
- push reminders
- any feature whose main success path is still simulated

---

## 6. Product Decisions Made in Phase 0

These decisions are assumed unless explicitly revised later:

1. **Implemented features stay in public launch scope by default.**
2. **The default strategy is harden-and-ship, not cut-and-ship.**
3. **Only flows that remain stubbed or simulated at release time should be hidden.**
4. **Notifications stay in scope as a feature area, but not as fake public behavior.**
5. **Premium can remain in the app only if public UX does not misrepresent simulated billing as real billing.**

---

## 7. Launch Success Criteria

Launch readiness is achieved only when:

- the primary launch journey works end to end
- secondary public features do not destabilize the app
- no client-side provider secrets remain
- the app does not expose fake premium or fake reminders as real production behavior
- core tests and release checks are green
- product messaging matches the app users actually receive

---

## 8. What This Means for Messaging

The investor and marketing story can stay broad, but it must become more precise:

- keep the larger product vision
- separate what is already public from what is still being hardened
- avoid claims that depend on stubbed reminders, simulated billing, or insecure AI boundaries

The goal is not to shrink the product story. The goal is to make the story defensible.
