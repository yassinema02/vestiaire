# Epic 4: 🤖 AI Outfit Engine

**Goal:** Implement the core AI-powered outfit suggestion system that generates complete, wearable outfit recommendations based on wardrobe, weather, and calendar context.

---

## Story 4.1: Outfit Data Model & Storage

> **As a** developer,  
> **I want** a database structure to store outfits and their relationships to items,  
> **so that** generated and saved outfits can be retrieved.

### Acceptance Criteria

1. `outfits` table created: id, user_id, name, occasion, is_ai_generated, created_at
2. `outfit_items` junction table: outfit_id, item_id, position
3. RLS policies ensure users only see their own outfits
4. Outfit can have 2-6 items (minimum top+bottom or dress)
5. API endpoints for CRUD operations on outfits
6. Outfit marked with weather context at creation time

---

## Story 4.2: AI Prompt Engineering & Integration

> **As a** system,  
> **I want** to generate outfit suggestions using GPT-4o-mini,  
> **so that** recommendations are context-aware and stylish.

### Acceptance Criteria

1. OpenAI API integrated via Supabase Edge Function
2. Prompt includes: wardrobe items, weather, calendar events
3. AI returns structured JSON: array of outfit suggestions with item IDs
4. Each suggestion includes: outfit name, occasion match, style rationale
5. Prompt optimized for token efficiency
6. Response cached in Redis for identical context (30 min TTL)
7. Fallback response if AI fails (random matching items)

---

## Story 4.3: Daily Outfit Suggestion Screen

> **As a** user,  
> **I want** to see AI-generated outfit suggestions for today,  
> **so that** I can quickly decide what to wear.

### Acceptance Criteria

1. Home screen shows primary outfit suggestion with item images
2. Weather and calendar context displayed above outfit
3. "Why this outfit?" explanation from AI visible
4. Outfit displayed as layered/composed view
5. "Regenerate" button fetches new suggestion
6. Loading state with skeleton/animation during generation
7. Empty state if wardrobe has <5 items

---

## Story 4.4: Swipe-Based Outfit Review

> **As a** user,  
> **I want** to swipe through multiple outfit suggestions,  
> **so that** I can find one that suits my mood.

### Acceptance Criteria

1. AI generates 3-5 outfit options per request
2. Card stack UI: swipe right to save, left to dismiss
3. Swipe up to see outfit details (items breakdown)
4. Saved outfits added to "My Outfits" collection
5. Animation feedback on swipe actions
6. "No more suggestions" state with regenerate option
7. Freemium limit enforced: 3 generations/day for free users

---

## Story 4.5: Manual Outfit Builder

> **As a** user,  
> **I want** to create my own outfits by selecting items,  
> **so that** I can save combinations I discover myself.

### Acceptance Criteria

1. "Create Outfit" button opens builder screen
2. Items organized by category for easy selection
3. Tap item to add to outfit preview
4. Visual preview shows selected items composed together
5. Save outfit with optional name and occasion tag
6. Outfit saved to "My Outfits" collection
7. Can edit existing outfits (add/remove items)

---

## Story 4.6: Outfit History & Favorites

> **As a** user,  
> **I want** to browse my saved outfits and favorites,  
> **so that** I can quickly repeat looks I love.

### Acceptance Criteria

1. "My Outfits" tab shows all saved outfits
2. Filter by: AI-generated vs manual, occasion, season
3. Favorite toggle on outfit cards
4. Favorites section at top for quick access
5. Outfit card shows preview of composed items
6. Tap outfit to view full details
7. Delete outfit option with confirmation

---

## Story 4.7: Morning Push Notification

> **As a** user,  
> **I want** to receive a morning notification with today's outfit,  
> **so that** I can start my day with a suggestion.

### Acceptance Criteria

1. Push notification scheduled for user-configurable time (default 7 AM)
2. Notification text: "Good morning! Here's your outfit for today ☀️"
3. Tap notification opens app to today's outfit suggestion
4. Notification includes weather preview in subtitle
5. User can disable in settings
6. Implemented via Expo Push Notifications + backend scheduler
