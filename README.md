# Vestiaire

AI-Powered Digital Wardrobe for Sustainable Fashion

## Overview

Vestiaire helps you digitize your wardrobe, get AI-powered outfit recommendations, track wardrobe analytics, and facilitate sustainable fashion through resale and gamification. Built as an iOS-first mobile app with React Native + Expo, powered by a Supabase backend and Google Gemini AI.

## Features

**Wardrobe Management**
- Photo capture and import with automatic background removal
- AI-powered item categorization (type, color, brand detection)
- Bulk upload support
- Gallery view with filtering by category, color, and season

**AI Outfit Recommendations**
- Context-aware outfit generation using wardrobe + weather + calendar events
- Swipe-based outfit discovery (save or skip)
- Manual outfit builder
- Daily outfit suggestions

**Calendar & Weather Integration**
- Apple Calendar sync with event-specific outfit suggestions
- Real-time weather data via Open-Meteo API
- Weekly outfit planning
- Time-of-day and event-type awareness

**Wardrobe Analytics**
- Cost-per-wear tracking
- Wear frequency heatmap calendar
- Neglected items detection (60+ days unworn)
- Health score and sustainability metrics
- Gap analysis and shopping recommendations

**Social**
- Outfit of the Day (OOTD) posts
- Style squads (create, join, browse)
- "Steal the Look" from squad members
- Comments and engagement

**Resale & Sustainability**
- AI-generated listing descriptions for unused items
- Smart resale prompts for neglected items
- Donation tracking
- Listing and earnings history

**Gamification**
- Levels (Closet Rookie to Style Master)
- Style points for uploads, wear logs, and outfit variety
- Daily streaks and challenges
- Achievement badges

**Travel**
- AI-generated packing lists
- Weather-aware trip outfit suggestions

**Premium**
- Subscription tiers with usage limits
- Trial mode

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native 0.81, Expo SDK 54, TypeScript 5.9 |
| **Routing** | Expo Router 6 (file-based) |
| **State** | Zustand 5 |
| **Animations** | React Native Reanimated 4 |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **AI** | Google Gemini (`@google/genai`) |
| **Weather** | Open-Meteo API |
| **Image Processing** | remove.bg API |
| **Fonts** | Source Serif Pro, Inter (via expo-font) |

## Project Structure

```
vestiaire/
├── apps/
│   └── mobile/              # React Native Expo app
│       ├── app/             # Expo Router file-based routes
│       │   ├── (auth)/      # Sign-in / sign-up screens
│       │   ├── (tabs)/      # Main app (40+ screens)
│       │   ├── onboarding.tsx
│       │   └── profile-setup.tsx
│       ├── components/      # UI, feature, and gamification components
│       ├── services/        # 58 service modules (AI, calendar, resale, etc.)
│       ├── stores/          # 9 Zustand stores
│       ├── hooks/           # Custom React hooks
│       ├── theme/           # Design tokens (colors, spacing, typography)
│       ├── types/           # TypeScript interfaces
│       ├── utils/           # Utility functions
│       └── constants/       # App constants and AI prompts
├── packages/
│   └── shared/              # Shared types, constants, utilities
├── supabase/
│   ├── migrations/          # 40 database migrations
│   └── functions/           # Edge Functions (ai-proxy, analyze-product, notify-ootd-post)
└── docs/                    # PRD, architecture, specs
```

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Xcode** (for iOS development)
- **iOS Simulator** (via Xcode)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your API keys

# Start iOS simulator
npm run ios
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run ios` | Start app in iOS simulator |
| `npm run android` | Start app in Android emulator |
| `npm run start` | Start Expo development server |
| `npm run test` | Run Jest tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run typecheck` | Run TypeScript type check |

## Architecture

- **Frontend:** React Native, Expo SDK 52+, TypeScript
- **Styling:** NativeWind (Tailwind for RN)
- **State:** Zustand + TanStack Query
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI:** OpenAI Gemini 2.5 Flash

## Documentation

- [PRD](docs/prd.md)
- [Architecture](docs/architecture.md)
- [UI/UX Spec](docs/front-end-spec.md)

## License

Private - All rights reserved
