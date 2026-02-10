# Technical Assumptions

## Repository Structure: Monorepo

```
vestiaire/
├── apps/
│   └── mobile/          # React Native + Expo app
├── packages/
│   └── shared/          # Shared types, utilities, constants
├── supabase/
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge Functions
└── docs/                # PRD, architecture, stories
```

## Service Architecture

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React Native + Expo SDK 52+ | Cross-platform ready, excellent DX, EAS Build for TestFlight |
| **Backend** | Supabase (PostgreSQL + Edge Functions) | Free tier generous, real-time, auth built-in |
| **API Layer** | Supabase Edge Functions (Deno) | Serverless, co-located with DB, low latency |
| **Auth** | Supabase Auth (Email + Apple Sign-In) | Native iOS integration, GDPR-ready |
| **Database** | PostgreSQL (via Supabase) | Robust, relational, excellent for wardrobe data model |
| **Storage** | Supabase Storage | Private buckets, signed URLs, image transformations |
| **Cache** | Upstash Redis | Serverless Redis, free tier, reduces API calls |
| **AI** | OpenAI GPT-4o-mini | Fast, cost-effective, good for outfit generation |
| **Image Processing** | remove.bg API or rembg (self-hosted) | Background removal for clothing photos |
| **Weather API** | OpenWeatherMap or Open-Meteo | Free tier available, location-based forecasts |
| **Calendar** | Google Calendar API + Apple EventKit | iOS native calendar access + Google integration |
| **Push Notifications** | Expo Push Notifications + APNs | Native iOS push via Expo's service |

## Testing Requirements

| Type | Tool | Coverage |
|------|------|----------|
| **Unit Tests** | Jest + React Native Testing Library | Core logic, utilities, hooks |
| **Integration Tests** | Jest + MSW (Mock Service Worker) | API interactions |
| **E2E Tests** | Maestro (optional for MVP) | Critical user flows |
| **Manual Testing** | TestFlight | Real device testing with beta users |

## Additional Technical Assumptions

- **Offline Support:** Basic caching for wardrobe gallery; full offline mode deferred to V2
- **Deep Linking:** Universal Links for future sharing features
- **Analytics:** Expo Analytics or PostHog for user behavior tracking
- **Error Tracking:** Sentry for crash reporting
- **CI/CD:** GitHub Actions → EAS Build → TestFlight
- **Environment Management:** Expo environment variables (.env) for API keys
- **Apple Sign-In:** Required for App Store apps with social login (Apple policy)
