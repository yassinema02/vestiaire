# Vestiaire 👗

AI-Powered Digital Wardrobe for Sustainable Fashion

## Overview

Vestiaire helps you digitize your wardrobe, get AI-powered outfit recommendations, and easily resell unused items. Built with React Native + Expo for iOS, powered by Supabase backend.

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Xcode** (for iOS development)
- **iOS Simulator** (via Xcode)

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd vestiaire

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
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run typecheck` | Run TypeScript check |

## Project Structure

```
vestiaire/
├── apps/
│   └── mobile/          # React Native + Expo app
├── packages/
│   └── shared/          # Shared types, constants, utilities
├── supabase/
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge Functions
├── docs/                # Documentation
└── .github/workflows/   # CI/CD
```

## Tech Stack

- **Frontend:** React Native, Expo SDK 52+, TypeScript
- **Styling:** NativeWind (Tailwind for RN)
- **State:** Zustand + TanStack Query
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI:** OpenAI GPT-4o-mini

## Documentation

- [PRD](docs/prd.md)
- [Architecture](docs/architecture.md)
- [UI/UX Spec](docs/front-end-spec.md)

## License

Private - All rights reserved
