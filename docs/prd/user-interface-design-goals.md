# User Interface Design Goals

## Overall UX Vision

A clean, visually-driven mobile-first experience that feels like browsing a curated fashion magazine. The interface prioritizes large clothing thumbnails, minimal text, and gesture-based interactions. Users should feel inspired, not overwhelmed — the AI does the heavy lifting while the user enjoys discovering their wardrobe's potential.

## Key Interaction Paradigms

| Paradigm | Description |
|----------|-------------|
| **Swipe-based outfit review** | Tinder-style swipe right to save, left to skip AI suggestions |
| **Quick-add camera flow** | One-tap photo capture → auto background removal → confirm & categorize |
| **Morning ritual notification** | Push notification → tap → see today's outfit → log or regenerate |
| **Gallery browsing** | Pinterest-style masonry grid for wardrobe exploration |
| **Gamification overlays** | Celebratory animations for level-ups, badges, streak milestones |

## Core Screens and Views

| Screen | Purpose |
|--------|---------|
| **Onboarding Flow** | Style preferences, initial 5-item upload challenge |
| **Home / Today** | Today's outfit suggestion, weather, calendar events |
| **Wardrobe Gallery** | All items in filterable grid view |
| **Item Detail** | Single item view with stats (CPW, wear count, last worn) |
| **Outfit Builder** | Manual outfit creation (drag-and-drop or tap-to-add) |
| **AI Suggestions** | Swipeable stack of AI-generated outfit cards |
| **Analytics Dashboard** | Cost-per-wear, most worn, neglected items, sustainability score |
| **Profile & Gamification** | Level progress, badges earned, streaks, settings |
| **Resale Generator** | Select items → generate listing text → copy to clipboard |

## Accessibility

**Target: WCAG AA compliance**
- Minimum contrast ratio 4.5:1 for text
- Touch targets minimum 44x44px
- Screen reader support for core flows
- Reduced motion option for animations

## Branding

| Element | Direction |
|---------|-----------|
| **Color Palette** | Warm neutrals (cream, beige, soft brown) with accent color (sage green or terracotta) |
| **Typography** | Modern sans-serif (Inter or Outfit) for readability |
| **Imagery** | Soft shadows, minimal borders, floating card aesthetic |
| **Tone** | Friendly, encouraging, sustainability-conscious |
| **Logo concept** | Stylized wardrobe/hanger icon with organic curves |

## Target Platforms

**iOS-Only for MVP**

| Aspect | Decision |
|--------|----------|
| **Primary Platform** | iOS (iPhone) |
| **Minimum iOS Version** | iOS 16+ |
| **Beta Testing** | TestFlight |
| **Production** | App Store (post-MVP) |
| **Android** | Deferred to V2 — codebase ready via React Native |
