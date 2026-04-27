# Requirements

## Functional Requirements

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

## Non-Functional Requirements

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