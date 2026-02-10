# Vestiaire Product Requirements Document (PRD)

> **An AI-Powered Digital Wardrobe for Sustainable Fashion**

---

## Goals

- Enable users to digitize their wardrobe through photo uploads with automatic background removal
- Provide AI-powered, context-aware outfit recommendations based on weather and calendar events
- Reduce wardrobe decision fatigue by surfacing relevant clothing combinations daily
- Maximize wardrobe utilization through analytics tracking (cost-per-wear, neglected items)
- Facilitate sustainable fashion practices via one-tap resale listing generation for unused items
- Increase user engagement and retention through gamification (levels, streaks, badges)

---

## Background Context

Vestiaire addresses two critical problems in modern fashion consumption: decision fatigue and wardrobe underutilization. Research shows only 20-30% of owned clothing is regularly worn, while unused items rarely reach the resale market. Users frequently feel they have "nothing to wear" despite full closets.

This mobile-first application targets environmentally conscious Gen Z and Millennials (18-35) who are time-poor but style-aware. By combining AI outfit suggestions with resale integration and gamification, Vestiaire creates a sustainable fashion ecosystem that maximizes existing wardrobe value while reducing impulse purchases.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-21 | 1.0 | Initial PRD created from Project Brief | John (PM) |

---

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR1** | Users shall be able to create an account and authenticate via email/password or OAuth (Apple Sign-In) |
| **FR2** | Users shall be able to upload clothing photos with automatic background removal processing |
| **FR3** | System shall auto-categorize uploaded items by type (tops, bottoms, shoes, accessories) and detect primary color |
| **FR4** | Users shall be able to manually edit item metadata (name, category, color, brand, purchase price, purchase date) |
| **FR5** | System shall display a visual wardrobe gallery with filtering by category, color, and season |
| **FR6** | System shall fetch current weather data based on user location to inform outfit suggestions |
| **FR7** | System shall integrate with calendar APIs (Google Calendar + Apple EventKit) to detect upcoming events and occasions |
| **FR8** | AI shall generate daily outfit recommendations based on weather, calendar events, and user style preferences |
| **FR9** | Users shall receive morning push notifications prompting "What are you wearing today?" |
| **FR10** | Users shall be able to log which outfit they wore each day (wear logging) |
| **FR11** | System shall calculate and display cost-per-wear analytics for each item |
| **FR12** | System shall identify and surface "neglected items" (not worn in 60+ days) |
| **FR13** | System shall generate resale listing descriptions (title, description, category) for unused items |
| **FR14** | Users shall earn style points for actions (uploads, wear logs, streaks) |
| **FR15** | System shall assign user levels (Closet Rookie → Style Master) based on wardrobe size and engagement |
| **FR16** | Users shall earn badges for achievements (streaks, sustainability actions, upload milestones) |
| **FR17** | Freemium users shall be limited to 3 AI outfit suggestions per day |
| **FR18** | Premium users shall have unlimited AI suggestions and access to advanced analytics |

> **MVP Scope Note:** The "Check Before You Buy" feature (paste/share product URLs to see wardrobe compatibility) is explicitly deferred to V2. Calendar integration with Google Calendar and Apple EventKit is included in MVP scope.

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR1** | Image upload and background removal shall complete within 5 seconds for images under 5MB |
| **NFR2** | AI outfit generation shall respond within 10 seconds under normal load |
| **NFR3** | System shall support 1,000 concurrent users in MVP phase |
| **NFR4** | All user data (images, wardrobe data) shall be stored in private buckets with signed URLs |
| **NFR5** | System shall comply with GDPR requirements for EU users (data export, deletion rights) |
| **NFR6** | Application shall be iOS-native, optimized for iPhone |
| **NFR7** | API infrastructure should leverage free-tier services where feasible (Supabase, Vercel, Upstash) |
| **NFR8** | System shall implement caching (Redis) to minimize API costs and latency |
| **NFR9** | Authentication tokens shall expire after 7 days of inactivity |
| **NFR10** | System shall maintain 99.5% uptime during MVP testing phase |

---

## User Interface Design Goals

### Overall UX Vision

A clean, visually-driven mobile-first experience that feels like browsing a curated fashion magazine. The interface prioritizes large clothing thumbnails, minimal text, and gesture-based interactions. Users should feel inspired, not overwhelmed — the AI does the heavy lifting while the user enjoys discovering their wardrobe's potential.

### Key Interaction Paradigms

| Paradigm | Description |
|----------|-------------|
| **Swipe-based outfit review** | Tinder-style swipe right to save, left to skip AI suggestions |
| **Quick-add camera flow** | One-tap photo capture → auto background removal → confirm & categorize |
| **Morning ritual notification** | Push notification → tap → see today's outfit → log or regenerate |
| **Gallery browsing** | Pinterest-style masonry grid for wardrobe exploration |
| **Gamification overlays** | Celebratory animations for level-ups, badges, streak milestones |

### Core Screens and Views

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

### Accessibility

**Target: WCAG AA compliance**
- Minimum contrast ratio 4.5:1 for text
- Touch targets minimum 44x44px
- Screen reader support for core flows
- Reduced motion option for animations

### Branding

| Element | Direction |
|---------|-----------|
| **Color Palette** | Warm neutrals (cream, beige, soft brown) with accent color (sage green or terracotta) |
| **Typography** | Modern sans-serif (Inter or Outfit) for readability |
| **Imagery** | Soft shadows, minimal borders, floating card aesthetic |
| **Tone** | Friendly, encouraging, sustainability-conscious |
| **Logo concept** | Stylized wardrobe/hanger icon with organic curves |

### Target Platforms

**iOS-Only for MVP**

| Aspect | Decision |
|--------|----------|
| **Primary Platform** | iOS (iPhone) |
| **Minimum iOS Version** | iOS 16+ |
| **Beta Testing** | TestFlight |
| **Production** | App Store (post-MVP) |
| **Android** | Deferred to V2 — codebase ready via React Native |

---

## Technical Assumptions

### Repository Structure: Monorepo

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

### Service Architecture

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

### Testing Requirements

| Type | Tool | Coverage |
|------|------|----------|
| **Unit Tests** | Jest + React Native Testing Library | Core logic, utilities, hooks |
| **Integration Tests** | Jest + MSW (Mock Service Worker) | API interactions |
| **E2E Tests** | Maestro (optional for MVP) | Critical user flows |
| **Manual Testing** | TestFlight | Real device testing with beta users |

### Additional Technical Assumptions

- **Offline Support:** Basic caching for wardrobe gallery; full offline mode deferred to V2
- **Deep Linking:** Universal Links for future sharing features
- **Analytics:** Expo Analytics or PostHog for user behavior tracking
- **Error Tracking:** Sentry for crash reporting
- **CI/CD:** GitHub Actions → EAS Build → TestFlight
- **Environment Management:** Expo environment variables (.env) for API keys
- **Apple Sign-In:** Required for App Store apps with social login (Apple policy)

---

## Epic List

| Epic | Title | Goal |
|------|-------|------|
| **Epic 1** | 🏗️ Foundation & Authentication | Establish project infrastructure and secure user authentication |
| **Epic 2** | 👗 Digital Wardrobe Core | Enable photo upload, background removal, and wardrobe organization |
| **Epic 3** | 🌤️ Context Integration | Connect weather and calendar data sources |
| **Epic 4** | 🤖 AI Outfit Engine | Implement AI-powered outfit recommendations |
| **Epic 5** | 📊 Wardrobe Analytics | Deliver cost-per-wear and usage insights |
| **Epic 6** | 🎮 Gamification System | Implement levels, streaks, and badges |
| **Epic 7** | ♻️ Resale Integration | Enable resale listing generation and premium features |

---

## Epic 1: 🏗️ Foundation & Authentication

**Goal:** Establish the complete development infrastructure for Vestiaire including Expo project setup, Supabase backend configuration, CI/CD pipeline to TestFlight, and secure user authentication.

### Story 1.1: Project Initialization & Development Environment

> **As a** developer,  
> **I want** a properly configured Expo project with TypeScript, linting, and folder structure,  
> **so that** I can begin development with best practices from day one.

**Acceptance Criteria:**
1. Expo project created with `npx create-expo-app` using TypeScript template
2. Folder structure follows monorepo pattern (`apps/mobile`, `packages/shared`)
3. ESLint + Prettier configured with React Native rules
4. Git repository initialized with `.gitignore` for React Native/Expo
5. README.md documents setup instructions and project structure
6. App runs successfully in Expo Go on iOS simulator

### Story 1.2: Supabase Backend Setup

> **As a** developer,  
> **I want** a configured Supabase project with database schema and storage buckets,  
> **so that** the app has a production-ready backend from the start.

**Acceptance Criteria:**
1. Supabase project created with appropriate region (EU for GDPR)
2. Initial database schema created for `users`, `profiles` tables
3. Row Level Security (RLS) policies enabled for user data
4. Storage bucket `wardrobe-images` created with private access
5. Supabase client configured in React Native app with environment variables
6. Connection verified: app can read from database

### Story 1.3: CI/CD Pipeline to TestFlight

> **As a** developer,  
> **I want** automated builds that deploy to TestFlight on every main branch push,  
> **so that** testers always have access to the latest version.

**Acceptance Criteria:**
1. EAS Build configured for iOS with valid provisioning profile
2. GitHub Actions workflow triggers on push to `main` branch
3. Workflow runs EAS Build and submits to TestFlight automatically
4. Build secrets (Apple credentials, Supabase keys) stored securely in GitHub
5. Successful test: push to main → build appears in TestFlight within 30 minutes
6. Build versioning increments automatically

### Story 1.4: Email/Password Authentication

> **As a** user,  
> **I want** to create an account with my email and password,  
> **so that** I can securely access my personal wardrobe.

**Acceptance Criteria:**
1. Sign-up screen with email, password, confirm password fields
2. Password validation: minimum 8 characters, 1 uppercase, 1 number
3. Email verification required before full access
4. Sign-in screen with email/password fields
5. "Forgot password" flow sends reset email
6. Session persists across app restarts (secure token storage)
7. Error states displayed for invalid credentials, network errors

### Story 1.5: Apple Sign-In Integration

> **As a** user,  
> **I want** to sign in with my Apple ID,  
> **so that** I can quickly access the app without creating a new password.

**Acceptance Criteria:**
1. "Sign in with Apple" button displayed on auth screens
2. Apple Sign-In flow completes successfully on iOS device
3. User profile created in Supabase with Apple-provided info
4. Existing users can link Apple ID to their account
5. Works on both TestFlight and Expo Go (development)
6. Complies with Apple's Human Interface Guidelines

### Story 1.6: App Shell & Navigation Structure

> **As a** user,  
> **I want** a clear navigation structure with tab bar and screens,  
> **so that** I can intuitively navigate the app.

**Acceptance Criteria:**
1. Bottom tab navigation with icons: Home, Wardrobe, Add, Outfits, Profile
2. Each tab renders a placeholder screen with title
3. Stack navigation within each tab for sub-screens
4. Auth flow: unauthenticated users see only auth screens
5. Tab bar hidden during authentication flow
6. Smooth transitions and animations between screens
7. App icon and splash screen configured with Vestiaire branding

---

## Epic 2: 👗 Digital Wardrobe Core

**Goal:** Enable users to build their digital wardrobe by photographing clothing items, automatically removing backgrounds, and organizing items by category and color.

### Story 2.1: Camera Capture & Image Upload

> **As a** user,  
> **I want** to take a photo of my clothing item directly in the app,  
> **so that** I can quickly add items to my wardrobe.

**Acceptance Criteria:**
1. "Add Item" button opens camera with photo capture option
2. Option to select from photo library as alternative
3. Image preview shown before confirming upload
4. Images compressed to max 2MB before upload
5. Upload progress indicator displayed
6. Image stored in Supabase Storage with signed URL
7. Camera permission request handled gracefully

### Story 2.2: Automatic Background Removal

> **As a** user,  
> **I want** the background automatically removed from my clothing photos,  
> **so that** my wardrobe looks clean and professional.

**Acceptance Criteria:**
1. Background removal triggered automatically after upload
2. Processing indicator shown during removal (3-5 seconds)
3. Original and processed images both stored
4. Processed image displayed in wardrobe gallery
5. Fallback: if removal fails, original image used with notification
6. Integration with remove.bg API or Edge Function using rembg

### Story 2.3: Auto-Categorization & Color Detection

> **As a** user,  
> **I want** my clothing items automatically categorized and color-detected,  
> **so that** I don't have to manually tag everything.

**Acceptance Criteria:**
1. AI analyzes image and suggests category (tops, bottoms, shoes, outerwear, accessories)
2. Dominant color(s) extracted and assigned to item
3. Suggestions presented to user for confirmation/editing
4. User can override AI suggestions with manual selection
5. Category and color stored in database with item record
6. Sub-categories available (e.g., tops → t-shirt, blouse, sweater)

### Story 2.4: Item Metadata Entry

> **As a** user,  
> **I want** to add details about my clothing item,  
> **so that** I can track its value and get better recommendations.

**Acceptance Criteria:**
1. Form fields: name (optional), brand, purchase price, purchase date
2. Season tags: Spring, Summer, Fall, Winter, All-Season
3. Occasion tags: Casual, Work, Formal, Sport, Night Out
4. All fields optional except category and color
5. Data saved to `items` table with user relationship
6. Form can be completed later (item saved as draft)

### Story 2.5: Wardrobe Gallery View

> **As a** user,  
> **I want** to see all my clothing items in a visual gallery,  
> **so that** I can browse my wardrobe easily.

**Acceptance Criteria:**
1. Masonry grid layout displaying all items with background-removed images
2. Filter by category (tabs or dropdown)
3. Filter by color (color swatches)
4. Filter by season and occasion
5. Sort options: newest, oldest, most worn, least worn
6. Search by item name or brand
7. Empty state with CTA to add first items
8. Pull-to-refresh updates gallery

### Story 2.6: Item Detail View

> **As a** user,  
> **I want** to view and edit details of a single item,  
> **so that** I can update information or see item stats.

**Acceptance Criteria:**
1. Full-size image display with zoom capability
2. All metadata displayed (name, brand, category, color, price, date)
3. Edit button allows modifying any field
4. Statistics shown: wear count (placeholder for Epic 5)
5. "Delete item" option with confirmation dialog
6. "Mark as favorite" toggle
7. Swipe gestures to navigate between items

### Story 2.7: Onboarding "First 5 Items" Challenge

> **As a** new user,  
> **I want** to be guided to upload my first 5 items,  
> **so that** I can start using AI features quickly.

**Acceptance Criteria:**
1. After sign-up, onboarding flow prompts to add 5 items
2. Progress indicator: "2/5 items added"
3. Skip option available (with warning about limited functionality)
4. Celebration animation upon completing 5 items
5. AI features unlocked message displayed
6. Onboarding state persisted (not shown again)

---

## Epic 3: 🌤️ Context Integration

**Goal:** Connect external data sources (weather and calendar) to provide contextual awareness for outfit recommendations.

### Story 3.1: User Location & Weather Display

> **As a** user,  
> **I want** to see current weather conditions for my location,  
> **so that** I can understand why certain outfits are recommended.

**Acceptance Criteria:**
1. App requests location permission on first use with clear explanation
2. Current location used to fetch weather data
3. Weather widget on Home screen shows: temperature, condition icon, "feels like"
4. Weather updates automatically when app opens (cached for 30 minutes)
5. Manual location override option in settings
6. Graceful fallback if location denied (manual city entry)
7. Integration with OpenWeatherMap or Open-Meteo API

### Story 3.2: Weather Forecast for Planning

> **As a** user,  
> **I want** to see weather forecast for the next few days,  
> **so that** I can plan outfits ahead of time.

**Acceptance Criteria:**
1. 5-day forecast displayed in collapsible section on Home
2. Each day shows: high/low temp, condition icon, precipitation chance
3. Tap on future day to get outfit suggestion for that day's weather
4. Forecast data cached and refreshed every 3 hours
5. Weather-to-clothing mapping defined (e.g., <10°C → suggest outerwear)

### Story 3.3: Google Calendar Integration

> **As a** user,  
> **I want** to connect my Google Calendar,  
> **so that** outfit suggestions consider my upcoming events.

**Acceptance Criteria:**
1. "Connect Google Calendar" option in settings
2. OAuth flow for Google Calendar read-only access
3. Today's events displayed on Home screen
4. Event titles and times shown (not full details for privacy)
5. Events tagged with detected occasion type (work, social, formal)
6. Option to disconnect calendar at any time
7. Calendar data refreshed on app open

### Story 3.4: Apple Calendar (EventKit) Integration

> **As a** user,  
> **I want** to use my iPhone's built-in calendar,  
> **so that** I don't need to connect external services.

**Acceptance Criteria:**
1. "Use iPhone Calendar" option in settings
2. EventKit permission requested with explanation
3. Today's events from all calendars displayed on Home
4. User can select which calendars to include
5. Same display format as Google Calendar events
6. Works alongside or instead of Google Calendar

### Story 3.5: Context Summary for AI

> **As a** system,  
> **I want** to compile weather and calendar data into a context object,  
> **so that** the AI can generate relevant outfit suggestions.

**Acceptance Criteria:**
1. Context object structure defined: `{ weather, events, date, dayOfWeek }`
2. Weather mapped to clothing needs (cold → layers, rain → waterproof)
3. Events mapped to occasion types (meeting → work, dinner → smart casual)
4. Context object available to AI prompt in Epic 4
5. Context stored temporarily for current session
6. Edge cases handled: no events, no weather, multiple events

---

## Epic 4: 🤖 AI Outfit Engine

**Goal:** Implement the core AI-powered outfit suggestion system that generates complete, wearable outfit recommendations based on wardrobe, weather, and calendar context.

### Story 4.1: Outfit Data Model & Storage

> **As a** developer,  
> **I want** a database structure to store outfits and their relationships to items,  
> **so that** generated and saved outfits can be retrieved.

**Acceptance Criteria:**
1. `outfits` table created: id, user_id, name, occasion, is_ai_generated, created_at
2. `outfit_items` junction table: outfit_id, item_id, position
3. RLS policies ensure users only see their own outfits
4. Outfit can have 2-6 items (minimum top+bottom or dress)
5. API endpoints for CRUD operations on outfits
6. Outfit marked with weather context at creation time

### Story 4.2: AI Prompt Engineering & Integration

> **As a** system,  
> **I want** to generate outfit suggestions using GPT-4o-mini,  
> **so that** recommendations are context-aware and stylish.

**Acceptance Criteria:**
1. OpenAI API integrated via Supabase Edge Function
2. Prompt includes: wardrobe items, weather, calendar events
3. AI returns structured JSON: array of outfit suggestions with item IDs
4. Each suggestion includes: outfit name, occasion match, style rationale
5. Prompt optimized for token efficiency
6. Response cached in Redis for identical context (30 min TTL)
7. Fallback response if AI fails (random matching items)

### Story 4.3: Daily Outfit Suggestion Screen

> **As a** user,  
> **I want** to see AI-generated outfit suggestions for today,  
> **so that** I can quickly decide what to wear.

**Acceptance Criteria:**
1. Home screen shows primary outfit suggestion with item images
2. Weather and calendar context displayed above outfit
3. "Why this outfit?" explanation from AI visible
4. Outfit displayed as layered/composed view
5. "Regenerate" button fetches new suggestion
6. Loading state with skeleton/animation during generation
7. Empty state if wardrobe has <5 items

### Story 4.4: Swipe-Based Outfit Review

> **As a** user,  
> **I want** to swipe through multiple outfit suggestions,  
> **so that** I can find one that suits my mood.

**Acceptance Criteria:**
1. AI generates 3-5 outfit options per request
2. Card stack UI: swipe right to save, left to dismiss
3. Swipe up to see outfit details (items breakdown)
4. Saved outfits added to "My Outfits" collection
5. Animation feedback on swipe actions
6. "No more suggestions" state with regenerate option
7. Freemium limit enforced: 3 generations/day for free users

### Story 4.5: Manual Outfit Builder

> **As a** user,  
> **I want** to create my own outfits by selecting items,  
> **so that** I can save combinations I discover myself.

**Acceptance Criteria:**
1. "Create Outfit" button opens builder screen
2. Items organized by category for easy selection
3. Tap item to add to outfit preview
4. Visual preview shows selected items composed together
5. Save outfit with optional name and occasion tag
6. Outfit saved to "My Outfits" collection
7. Can edit existing outfits (add/remove items)

### Story 4.6: Outfit History & Favorites

> **As a** user,  
> **I want** to browse my saved outfits and favorites,  
> **so that** I can quickly repeat looks I love.

**Acceptance Criteria:**
1. "My Outfits" tab shows all saved outfits
2. Filter by: AI-generated vs manual, occasion, season
3. Favorite toggle on outfit cards
4. Favorites section at top for quick access
5. Outfit card shows preview of composed items
6. Tap outfit to view full details
7. Delete outfit option with confirmation

### Story 4.7: Morning Push Notification

> **As a** user,  
> **I want** to receive a morning notification with today's outfit,  
> **so that** I can start my day with a suggestion.

**Acceptance Criteria:**
1. Push notification scheduled for user-configurable time (default 7 AM)
2. Notification text: "Good morning! Here's your outfit for today ☀️"
3. Tap notification opens app to today's outfit suggestion
4. Notification includes weather preview in subtitle
5. User can disable in settings
6. Implemented via Expo Push Notifications + backend scheduler

---

## Epic 5: 📊 Wardrobe Analytics

**Goal:** Deliver actionable wardrobe insights that help users understand their clothing usage patterns through cost-per-wear tracking and neglected items detection.

### Story 5.1: Wear Logging System

> **As a** user,  
> **I want** to log which items I wear each day,  
> **so that** the app can track my clothing usage.

**Acceptance Criteria:**
1. "Log Today's Outfit" button accessible from Home screen
2. Quick selection: tap items worn today from wardrobe grid
3. Or: select a saved outfit as "worn today"
4. Wear log stored: user_id, item_id, date, outfit_id (optional)
5. Can log multiple times per day (different occasions)
6. Can edit/delete past wear logs
7. Visual confirmation: "Logged! 👗" animation

### Story 5.2: Evening Reminder Notification

> **As a** user,  
> **I want** an evening reminder to log my outfit,  
> **so that** I don't forget to track what I wore.

**Acceptance Criteria:**
1. Push notification at user-configurable time (default 8 PM)
2. Notification: "What did you wear today? Log your outfit! 📝"
3. Tap opens app to wear logging screen
4. Notification skipped if outfit already logged today
5. User can disable in settings
6. Smart timing: not sent if app was opened recently

### Story 5.3: Cost-Per-Wear Calculation

> **As a** user,  
> **I want** to see the cost-per-wear for each item,  
> **so that** I understand the value I'm getting from my clothes.

**Acceptance Criteria:**
1. CPW calculated: purchase_price / wear_count
2. CPW displayed on item detail screen
3. CPW badge on wardrobe gallery cards
4. Color coding: green (<£5), yellow (£5-20), red (>£20)
5. Items without price show "Add price to track CPW"
6. CPW updates in real-time after each wear log
7. Celebration when CPW drops below threshold

### Story 5.4: Neglected Items Detection

> **As a** user,  
> **I want** to see which items I haven't worn recently,  
> **so that** I can rediscover forgotten clothes or consider selling them.

**Acceptance Criteria:**
1. "Neglected" filter in wardrobe gallery
2. Neglected = not worn in 60+ days (configurable)
3. Neglected items highlighted with badge/icon
4. Analytics dashboard shows count of neglected items
5. Suggestion: "5 items haven't been worn in 2 months"
6. Quick action: "Suggest outfit with this item"
7. Quick action: "Create resale listing" (links to Epic 7)

### Story 5.5: Most Worn Items Leaderboard

> **As a** user,  
> **I want** to see my most-worn items,  
> **so that** I know which clothes I truly love.

**Acceptance Criteria:**
1. "Top Worn" section in Analytics dashboard
2. Top 10 items ranked by wear count
3. Visual: podium or ranked list with wear counts
4. Breakdown by category available
5. Time filter: all time, this month, this season
6. Insight: "Your black jeans are your wardrobe MVP! 🏆"

### Story 5.6: Wardrobe Analytics Dashboard

> **As a** user,  
> **I want** a dashboard summarizing my wardrobe insights,  
> **so that** I can see usage patterns at a glance.

**Acceptance Criteria:**
1. Dashboard accessible from Profile tab
2. Summary cards: Total items, Total value, Avg CPW
3. Chart: Wardrobe distribution by category (pie/donut)
4. Chart: Wear frequency over time (last 30 days)
5. Insights section: AI-generated tips based on data
6. "Neglected items" count with link to filter
7. "Sustainability score" placeholder (for Epic 6)

### Story 5.7: Wear Calendar View

> **As a** user,  
> **I want** to see a calendar of what I wore each day,  
> **so that** I can review my outfit history.

**Acceptance Criteria:**
1. Monthly calendar view in Analytics section
2. Days with logged outfits show thumbnail/dot indicator
3. Tap day to see outfit worn that day
4. Multiple outfits per day supported
5. Navigate between months
6. Empty days show "No outfit logged"
7. Stats: "You logged 18 outfits this month"

---

## Epic 6: 🎮 Gamification System

**Goal:** Implement engagement mechanics that reward users for building their wardrobe through levels, streaks, and badges.

### Story 6.1: Style Points System

> **As a** user,  
> **I want** to earn style points for my actions,  
> **so that** I feel rewarded for engaging with the app.

**Acceptance Criteria:**
1. Points earned for: upload item (+10), log outfit (+5), complete streak day (+3)
2. Bonus points for: first item of day (+2), completing challenges (+20-50)
3. Points total displayed on Profile screen
4. Points history viewable (last 30 days)
5. Animation on point earn (floating +10)
6. Database: `user_stats` table tracks total points

### Story 6.2: User Levels & Progression

> **As a** user,  
> **I want** to level up as I use the app,  
> **so that** I feel a sense of achievement.

**Acceptance Criteria:**
1. 6 levels: Closet Rookie → Style Master
2. Levels based on item count thresholds (0, 10, 25, 50, 100, 200)
3. Level displayed prominently on Profile screen
4. Progress bar shows progress to next level
5. Level-up celebration animation when threshold reached
6. Level unlocks displayed
7. Level badge visible on user avatar

### Story 6.3: Streak Tracking

> **As a** user,  
> **I want** to maintain a daily streak by logging outfits,  
> **so that** I stay motivated to use the app consistently.

**Acceptance Criteria:**
1. Streak counter tracks consecutive days with outfit logs
2. Current streak displayed on Home and Profile screens
3. Streak fire icon 🔥 with day count
4. Streak breaks if no outfit logged by midnight
5. Grace period: 1 "freeze" per week to protect streak
6. Streak milestones: 7, 30, 100 days trigger rewards
7. Streak lost notification with encouragement message

### Story 6.4: Badges & Achievements

> **As a** user,  
> **I want** to earn badges for achievements,  
> **so that** I have collectible goals to work toward.

**Acceptance Criteria:**
1. Badge categories: Upload, Engagement, Sustainability, Secret
2. At least 12 badges implemented for MVP
3. Badges displayed in grid on Profile screen
4. Locked badges shown as silhouettes with hints
5. Badge unlock triggers celebration animation
6. Push notification for significant badge unlocks
7. Badge showcase: user can select 1-3 featured badges

**Badge List:**
| Badge | Category | Requirement |
|-------|----------|-------------|
| First Step | Upload | Upload first item |
| Closet Complete | Upload | Upload 50 items |
| Week Warrior | Engagement | 7-day streak |
| Streak Legend | Engagement | 30-day streak |
| Early Bird | Engagement | Log outfit before 8 AM |
| Rewear Champion | Sustainability | Wear same item 10+ times |
| Circular Seller | Sustainability | Create first resale listing |
| Monochrome Master | Secret | Create all-black outfit |
| Rainbow Warrior | Secret | Own items in 7+ colors |
| OG Member | Secret | User since launch month |
| Weather Warrior | Secret | Log outfit in rain/snow |
| Style Guru | Upload | Upload 100 items |

### Story 6.5: Sustainability Score

> **As a** user,  
> **I want** to see my sustainability score,  
> **so that** I can track my eco-friendly fashion habits.

**Acceptance Criteria:**
1. Score calculated 0-100 based on wardrobe utilization
2. Factors: avg wear count, % items worn recently, CPW average
3. Score displayed on Analytics dashboard
4. Comparison: "Top 15% of Vestiaire users!"
5. Tips to improve score
6. Score recalculated weekly
7. Visual: leaf icon with score, color gradient

### Story 6.6: Closet Safari Challenge (Onboarding)

> **As a** new user,  
> **I want** to participate in the "Closet Safari" challenge,  
> **so that** I'm motivated to quickly build my wardrobe.

**Acceptance Criteria:**
1. Challenge offered after signup: "Upload 20 items in 7 days"
2. Progress tracker: "12/20 items, 4 days remaining"
3. Daily reminder notifications during challenge
4. Reward: 1 month Premium free upon completion
5. Challenge badge unlocked for participation
6. Challenge can be skipped
7. One-time challenge, not repeatable

### Story 6.7: Gamification Profile View

> **As a** user,  
> **I want** a dedicated view showing all my gamification progress,  
> **so that** I can see my full achievement history.

**Acceptance Criteria:**
1. Gamification section on Profile tab
2. Shows: current level, XP progress, current streak, total points
3. Badge collection grid with earned/locked status
4. Recent activity feed (last 5 events)
5. Leaderboard placeholder (future social feature)
6. Share button to export achievements card

---

## Epic 7: ♻️ Resale Integration

**Goal:** Enable users to easily create resale listings for unused items, turning neglected clothes into value. Also implements freemium/premium tier differentiation.

### Story 7.1: Resale Candidate Identification

> **As a** user,  
> **I want** to see which items are good candidates for resale,  
> **so that** I know what to consider selling.

**Acceptance Criteria:**
1. "Ready to Sell" section on Analytics dashboard
2. Algorithm identifies: items not worn in 90+ days, high CPW items
3. Items ranked by "resale potential" score
4. Quick filter in wardrobe: "Resale Candidates"
5. Nudge notification: "You have 3 items you haven't worn in 3 months"
6. CTA: "Create listing" button on candidate items

### Story 7.2: AI Listing Generator

> **As a** user,  
> **I want** the app to generate a resale listing description,  
> **so that** I can quickly list items on Vinted without writing.

**Acceptance Criteria:**
1. "Generate Listing" action on item detail screen
2. AI generates: title, description, suggested category, condition guess
3. Uses item metadata: brand, color, category, photos
4. Description optimized for Vinted format and SEO
5. Multiple description style options: casual, detailed, minimal
6. User can edit generated text before copying
7. Generation takes <5 seconds

### Story 7.3: Listing Copy & Share

> **As a** user,  
> **I want** to copy my listing and share it to Vinted,  
> **so that** I can post my item for sale.

**Acceptance Criteria:**
1. "Copy to Clipboard" button copies full listing text
2. "Share" button opens system share sheet
3. Direct "Open in Vinted" button (if Vinted app installed)
4. Success confirmation: "Copied! Paste in Vinted to list"
5. Photo export option: save background-removed image to camera roll
6. Tutorial overlay on first use

### Story 7.4: Listing History

> **As a** user,  
> **I want** to track items I've created listings for,  
> **so that** I can manage my resale activity.

**Acceptance Criteria:**
1. "Listings Created" section in Analytics/Profile
2. Shows: item, listing text, date created
3. Status options: Listed, Sold, Cancelled
4. Mark as "Sold" removes item from wardrobe
5. Sold items tracked for lifetime stats
6. Re-generate listing option for unsold items

### Story 7.5: Freemium Tier Limits

> **As a** system,  
> **I want** to enforce usage limits for free users,  
> **so that** premium subscriptions have clear value.

**Acceptance Criteria:**
1. Free tier: 3 AI outfit suggestions per day
2. Free tier: 2 resale listings per month
3. Usage counters displayed in app
4. Soft paywall when limit reached: "Upgrade for unlimited"
5. Countdown timer: "Refreshes in 12 hours"
6. Limits stored in `user_stats` table, reset on schedule
7. Premium users: unlimited everything

### Story 7.6: Premium Subscription Flow

> **As a** user,  
> **I want** to upgrade to Premium,  
> **so that** I can access unlimited features.

**Acceptance Criteria:**
1. "Upgrade to Premium" screen accessible from Profile
2. Clear comparison: Free vs Premium features
3. Price displayed: £4.99/month
4. Apple In-App Purchase integration
5. Subscription managed via App Store
6. Premium badge displayed on profile
7. "Restore Purchases" option for reinstalls
8. Graceful downgrade: features limited, data preserved

**Premium Benefits:**
| Feature | Free | Premium |
|---------|------|---------|
| AI outfit suggestions | 3/day | Unlimited |
| Resale listings | 2/month | Unlimited |
| Advanced analytics | Basic | Full |
| Sustainability score | ❌ | ✅ |
| Priority support | ❌ | ✅ |
| Early access features | ❌ | ✅ |

### Story 7.7: Premium Onboarding Reward

> **As a** new user who completes "Closet Safari",  
> **I want** to receive 1 month of Premium free,  
> **so that** I can experience the full app value.

**Acceptance Criteria:**
1. On Closet Safari completion, Premium activated for 30 days
2. No credit card required for trial
3. Countdown displayed: "Premium trial: 23 days remaining"
4. Reminder notification at 7 days and 1 day before expiry
5. Smooth transition back to Free tier if not subscribed
6. Upsell prompt at trial end

---

## Next Steps

### UX Expert Prompt

> **Activate UX Expert mode.** Review the Vestiaire PRD (`docs/prd.md`) and create a comprehensive design system including: color palette, typography, component library, and high-fidelity wireframes for the 9 core screens listed in UI Design Goals. Focus on the iOS-native experience with warm neutrals and sustainability-focused branding.

### Architect Prompt

> **Activate Architect mode.** Review the Vestiaire PRD (`docs/prd.md`) and create the technical architecture document. Define the complete database schema, API endpoints, Supabase Edge Functions structure, and integration patterns for OpenAI, weather API, and calendar services. Prioritize the React Native + Expo + Supabase stack with CI/CD to TestFlight.

---

*Document generated by John (PM Agent) — January 21, 2026*
