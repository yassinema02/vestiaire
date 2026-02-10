# Vestiaire V2 Product Requirements Document (PRD)

> **Smart Shopping Companion & Social Style Community**

---

## Goals

- Enable **instant wardrobe compatibility analysis** for potential purchases via screenshot/URL
- Provide **AI-powered wardrobe extraction** from existing photos to eliminate onboarding friction
- Create **private social circles** for daily outfit sharing and inspiration
- Deliver **proactive outfit planning** through calendar integration and weather awareness
- Maximize **wardrobe sustainability** through advanced analytics and circular resale triggers
- Build **engagement habits** through social validation and daily use cases

---

## Background Context

Vestiaire V2 transforms the app from a passive wardrobe organizer into an **active shopping intelligence tool** and **social style platform**. V1 successfully solved decision fatigue through AI outfit suggestions. V2 tackles the **pre-purchase problem**: "Will this item work with what I own?"

Research shows:
- **60% of clothing purchased** is rarely worn (ThredUp, 2024)
- **$200-400 wasted annually** per person on impulse buys that don't match existing wardrobes
- **40% of online returns** due to "doesn't match my style"
- **87% of Gen Z** want tools to help make smarter shopping decisions

V2 also adds **social proof** through private Style Squads (BeReal-style intimacy) and **magic onboarding** via AI photo extraction (eliminating the manual photo barrier).

**Target Users:** Same as V1 (fashion-conscious 18-35), but expanded to include active shoppers and small friend groups seeking outfit inspiration.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-21 | 1.0 | V1 PRD created | John (PM) |
| 2026-02-09 | 2.0 | V2 PRD created - Shopping Assistant, Social, AI Extraction | Mary (Analyst) |

---

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR19** | Users shall be able to analyze product screenshots to check wardrobe compatibility |
| **FR20** | Users shall be able to paste product URLs for automated compatibility analysis |
| **FR21** | System shall extract product details (name, color, style, brand) from images/URLs |
| **FR22** | System shall calculate compatibility scores (0-100) based on wardrobe matching |
| **FR23** | System shall show which existing items pair well with potential purchases |
| **FR24** | Users shall be able to save analyzed products to a shopping wishlist |
| **FR25** | Users shall be able to bulk upload photos for AI wardrobe extraction |
| **FR26** | AI shall detect multiple clothing items within a single photo |
| **FR27** | System shall auto-categorize and tag extracted items from photos |
| **FR28** | Users shall be able to create private Style Squads (friend groups) |
| **FR29** | Users shall be able to post daily OOTD photos tagged with wardrobe items |
| **FR30** | Users shall see a chronological feed of friends' OOTD posts |
| **FR31** | Users shall be able to comment, react, and "steal" outfit ideas |
| **FR32** | System shall integrate with iOS/Android calendar to detect upcoming events |
| **FR33** | System shall proactively suggest outfits based on calendar events |
| **FR34** | Users shall be able to schedule outfit plans for future days |
| **FR35** | System shall track item neglect (not worn in 180+ days) |
| **FR36** | System shall trigger resale prompts for neglected items |
| **FR37** | System shall calculate environmental savings from re-wearing vs buying new |
| **FR38** | System shall identify wardrobe gaps (missing item types for weather/occasions) |

### Non-Functional Requirements

| ID | Requirement |
|----|----------------|
| **NFR11** | Screenshot analysis shall complete within 5 seconds |
| **NFR12** | URL scraping shall complete within 8 seconds for supported sites |
| **NFR13** | AI photo extraction shall process 20 photos in under 2 minutes |
| **NFR14** | OOTD feed shall load within 2 seconds (< 3G network) |
| **NFR15** | Calendar sync shall not drain battery (efficient polling) |
| **NFR16** | Social photos shall be compressed to < 500KB for fast uploads |
| **NFR17** | Shopping scans shall work offline (queue for later analysis) |
| **NFR18** | Compatibility algorithm shall scale to 500+ item wardrobes |
| **NFR19** | V2 features shall not increase app bundle size by more than 10MB |
| **NFR20** | All new features shall support dark mode |

---

## Epic List

| Epic | Title | Goal |
|------|-------|------|
| **Epic 8** | 🛍️ Shopping Assistant | Enable pre-purchase wardrobe compatibility analysis |
| **Epic 9** | 📸 Social OOTD Feed | Create private outfit sharing communities |
| **Epic 10** | ✨ AI Wardrobe Extraction | Eliminate onboarding friction with photo bulk upload |
| **Epic 11** | 📊 Advanced Analytics 2.0 | Provide sustainability insights and wardrobe gap analysis |
| **Epic 12** | 📅 Calendar Integration | Deliver proactive outfit planning for events |
| **Epic 13** | ♻️ Circular Resale Triggers | Automate resale prompts for neglected items |

---

## Epic 8: 🛍️ Shopping Assistant ("Check Before You Buy")

**Goal:** Enable users to analyze potential clothing purchases (via screenshot or URL) to determine compatibility with their existing wardrobe before buying.

### Story 8.1: Screenshot Product Analysis

> **As a** shopper browsing Instagram or shopping apps,  
> **I want** to screenshot a product and see if it matches my wardrobe,  
> **so that** I can avoid buying items that won't work with what I own.

**Acceptance Criteria:**
1. "Check Before You Buy" button prominently displayed on Home screen
2. User can upload screenshot from gallery or take new photo
3. App detects product in image (clothing item, not background)
4. Loading indicator shows "Analyzing..." (3-5 seconds)
5. If multiple items detected, user selects which to analyze
6. Error handling: low quality images show warning
7. Successful analysis displays compatibility results screen

### Story 8.2: URL Product Scraping

> **As a** shopper on Zara/H&M/ASOS website,  
> **I want** to paste the product URL directly,  
> **so that** I can get precise product details analyzed.

**Acceptance Criteria:**
1. "Paste URL" input field on Shopping Assistant screen
2. Supports major fashion sites: Zara, H&M, ASOS, Mango, Uniqlo, Everlane
3. Scrapes: product image, name, brand, color, price (if available)
4. Uses Open Graph meta tags and schema.org markup
5. Fallback to screenshot method if scraping fails
6. Invalid URL shows helpful error: "We couldn't load this page. Try screenshot instead."
7. Loading indicator during scraping (5-8 seconds)

### Story 8.3: AI Product Extraction

> **As a** system,  
> **I want** to extract structured product data from images/URLs,  
> **so that** compatibility analysis can be performed accurately.

**Acceptance Criteria:**
1. Gemini 1.5 Pro analyzes image to extract product details
2. Structured data returned: name, category, color, secondary_colors, style, material, pattern, season, formality (1-10)
3. Product data stored in `shopping_scans` table
4. If extraction fails, user can manually input details
5. Extracted data shown to user for confirmation/editing
6. Edge Function handles API call to Gemini (keeps API key server-side)

### Story 8.4: Compatibility Score Calculation

> **As a** user analyzing a product,  
> **I want** to see a compatibility score with my wardrobe,  
> **so that** I can quickly judge if this is a good purchase.

**Acceptance Criteria:**
1. Score calculated 0-100 based on algorithm (color harmony 30%, style consistency 25%, gap filling 20%, versatility 15%, formality 10%)
2. Score displayed prominently with rating: "Perfect Match 🎯" (90-100), "Great Choice ✨" (75-89), "Good Fit 👍" (60-74), "Might Work ⚠️" (40-59), "Careful ❗" (0-39)
3. Progress bar visualization of score
4. Score color-coded (green, yellow, orange, red)
5. Score explanation: "Based on your warm-toned wardrobe"
6. Recalculates if user makes changes to product details

### Story 8.5: Matching Items Display

> **As a** user reviewing compatibility,  
> **I want** to see which items in my wardrobe match the product,  
> **so that** I can visualize complete outfits.

**Acceptance Criteria:**
1. Top 5 matching items displayed as image thumbnails
2. Each item shows: image, name, match reason ("Classic pairing", "Color harmony")
3. Tap item to view full details
4. "See All Matches" expands to show 10+ items
5. Items grouped by category (tops, bottoms, shoes)
6. If no matches found: "You don't have complementary items. Consider adding X to your wardrobe."
7. Visual outfit preview: new item + matching items displayed together

### Story 8.6: AI-Generated Insights

> **As a** user deciding on a purchase,  
> **I want** to receive personalized insights about the product,  
> **so that** I can make an informed decision.

**Acceptance Criteria:**
1. 3 insights generated by Gemini based on wardrobe analysis
2. Insight categories: Style feedback, Wardrobe gap, Value proposition
3. Example insights:
   - "This green dress complements your warm-toned wardrobe beautifully"
   - "You don't have shoes that match this dress. Consider black heels."
   - "High versatility = great cost-per-wear potential"
   - "This overlaps with your blue blazer. Do you need both?"
4. Insights displayed below compatibility score
5. Honest, helpful tone (not always positive)
6. Length: 2-3 sentences per insight

### Story 8.7: Shopping Wishlist

> **As a** user who analyzed a product,  
> **I want** to save it to a wishlist,  
> **so that** I can compare options and decide later.

**Acceptance Criteria:**
1. "Save to Wishlist" button on compatibility results screen
2. Item saved with: product image, name, URL, compatibility score, matching items, insights
3. "Shopping Wishlist" accessible from Profile or Shopping Assistant screen
4. Wishlist displays items in grid with compatibility scores
5. Sort by: score, date added, price
6. Filter by: category, brand
7. Delete items from wishlist
8. "Re-analyze" button updates compatibility as wardrobe changes

### Story 8.8: Scan History & Analytics

> **As a** user who scans products regularly,  
> **I want** to view my scan history,  
> **so that** I can track my shopping research.

**Acceptance Criteria:**
1. "Scan History" screen shows all past scans
2. Each scan shows: product image, name, compatibility score, date
3. Tap scan to view full analysis again
4. Filter by: date, score range, scanned vs wishlist
5. Statistics: "You scanned 12 items this month, added 3 to wardrobe"
6. "Scan again" re-analyzes with updated wardrobe
7. User rating prompt: "Was this scan helpful?" (1-5 stars) for metrics

---

## Epic 9: 📸 Social OOTD Feed

**Goal:** Create private Style Squads where users share daily outfits with close friends for inspiration and social validation.

### Story 9.1: Style Squads Creation

> **As a** user,  
> **I want** to create a private friend group,  
> **so that** I can share my outfits with a select circle.

**Acceptance Criteria:**
1. "Create Style Squad" button in Social tab
2. Squad setup: name, optional description, invite code
3. Invite friends via: unique code, SMS, or username search
4. Squad size limit: 20 members (BeReal-style intimacy)
5. User can belong to multiple squads
6. Squad member list visible with profile pictures
7. Squad admin can remove members

### Story 9.2: OOTD Posting Flow

> **As a** user,  
> **I want** to post my daily outfit to my Style Squad,  
> **so that** my friends can see what I'm wearing today.

**Acceptance Criteria:**
1. "Post OOTD" button on Social tab (camera icon)
2. Camera opens for selfie/mirror photo
3. Option to select from gallery if already taken
4. Tag wardrobe items in outfit (tap to select)
5. Optional caption (max 150 characters)
6. Select which Squad(s) to post to
7. "Post" button publishes to feed
8. Confirmation: "Posted to Style Squad! 📸"
9. Posted OOTD shows: photo, tagged items, caption, timestamp

### Story 9.3: OOTD Feed Display

> **As a** user,  
> **I want** to see my friends' daily outfits,  
> **so that** I can get inspired and stay connected.

**Acceptance Criteria:**
1. Social tab shows chronological feed of OOTD posts
2. Feed combines posts from all joined Squads
3. Each post shows: user avatar, name, outfit photo, caption, timestamp
4. Tap photo to expand full-screen
5. Tagged items displayed below photo (thumbnails)
6. Filter by: All Squads, specific Squad
7. Pull-to-refresh updates feed
8. Loading skeleton while fetching posts

### Story 9.4: Reactions & Comments

> **As a** user viewing friend's OOTD,  
> **I want** to react and comment,  
> **so that** I can engage and validate their style.

**Acceptance Criteria:**
1. Reaction button: 🔥 (fire emoji, single tap)
2. Reaction count displayed on post
3. Comment button opens comment sheet
4. Comments support text only (no photos)
5. Comment character limit: 200
6. Comment notifications sent to post author
7. User can delete their own comments
8. Post author can delete any comments on their post

### Story 9.5: "Steal This Look" Feature

> **As a** user inspired by friend's outfit,  
> **I want** to recreate it with my own wardrobe,  
> **so that** I can try similar style combinations.

**Acceptance Criteria:**
1. "Steal This Look" button on OOTD posts
2. App identifies similar items in user's wardrobe
3. Suggests closest matches by category, color, style
4. If exact match exists: "You have the same jacket!"
5. If similar: "Try your navy blazer instead of black"
6. If missing: "You don't have X. Want to add it to wishlist?"
7. Creates saved outfit in user's collection with attribution

### Story 9.6: OOTD Notifications

> **As a** user,  
> **I want** to be notified when friends post outfits,  
> **so that** I don't miss their daily looks.

**Acceptance Criteria:**
1. Push notification when Squad member posts OOTD
2. Notification text: "Sarah just posted her OOTD! 📸"
3. Tap opens app to that specific post
4. Notification settings: All posts, Only morning posts, Off
5. Quiet hours respected (default: no notifications 10 PM - 7 AM)
6. Batch notifications if multiple posts (max 3/day)

### Story 9.7: OOTD Posting Reminder

> **As a** user,  
> **I want** a daily reminder to post my outfit,  
> **so that** I stay consistent with sharing.

**Acceptance Criteria:**
1. Optional morning reminder (default: 9 AM)
2. Notification: "What are you wearing today? Share with your Squad! 📸"
3. Skipped if user already posted today
4. User-configurable time in settings
5. Can be disabled entirely
6. BeReal-style variant (future): Random time each day

---

## Epic 10: ✨ AI Wardrobe Extraction

**Goal:** Eliminate onboarding friction by allowing users to bulk upload photos (Instagram, selfies, gallery) and automatically extract clothing items via AI.

### Story 10.1: Bulk Photo Upload

> **As a** new user,  
> **I want** to upload multiple photos at once,  
> **so that** I can populate my wardrobe quickly.

**Acceptance Criteria:**
1. "Magic Wardrobe Import" button on Wardrobe screen
2. Options: "Upload from Gallery", "Connect Instagram" (future)
3. Multi-select interface for gallery (up to 50 photos)
4. Upload progress bar for batch
5. Photos stored temporarily in Supabase Storage
6. Batch processing queue created
7. Estimated time displayed: "Analyzing 20 photos... ~2 minutes"

### Story 10.2: Multi-Item Detection

> **As a** system,  
> **I want** to detect all clothing items in a photo,  
> **so that** users get maximum value from each image.

**Acceptance Criteria:**
1. Gemini 1.5 Pro processes each photo to detect items
2. Prompt identifies: tops, bottoms, shoes, jackets, accessories worn/visible
3. Returns array of detected items per photo
4. Each item includes: category, color, style, position in photo
5. Edge Function handles batch processing (queue system)
6. Processing limited to 5 items per photo max
7. Fallback: If detection fails, skip photo with note

### Story 10.3: Background Removal for Extracted Items

> **As a** user,  
> **I want** extracted items to have clean backgrounds,  
> **so that** my wardrobe gallery looks professional.

**Acceptance Criteria:**
1. Each detected item sent to Remove.bg API
2. Background removal applied
3. Processed images stored in user's wardrobe bucket
4. If background removal fails, original cropped item used
5. Batch processing optimized (parallel API calls)
6. Cost tracking: log API usage per user

### Story 10.4: Review & Confirm Interface

> **As a** user after photo extraction,  
> **I want** to review detected items before adding to wardrobe,  
> **so that** I can correct mistakes and remove unwanted items.

**Acceptance Criteria:**
1. "Review Extracted Items" screen shows all detected items
2. Grid layout with item preview, category, color
3. Each item has: ✓ Keep, ✕ Remove toggles
4. Tap item to edit: category, color, name
5. Batch actions: "Keep All", "Remove All Accessories"
6. Confirmation summary: "22 items ready to add"
7. "Add to Wardrobe" button imports confirmed items

### Story 10.5: Auto-Categorization for Extracted Items

> **As a** system,  
> **I want** to auto-categorize extracted items accurately,  
> **so that** users have minimal editing to do.

**Acceptance Criteria:**
1. Gemini assigns category, color, style, material for each item
2. Accuracy target: ≥85% for category, ≥75% for color
3. Confidence scores returned (optional manual review if <70%)
4. Metadata stored: extraction_source="photo_import", original_photo_url
5. Items tagged with creation_method="ai_extraction"
6. Duplicate detection: warn if similar item already exists

### Story 10.6: Extraction Progress & Feedback

> **As a** user during extraction,  
> **I want** to see progress and status updates,  
> **so that** I know the process is working.

**Acceptance Criteria:**
1. Progress screen with animated indicator
2. Status updates: "Processing photo 5 of 20...", "Removing backgrounds...", "Almost done!"
3. Estimated time remaining displayed
4. Allow user to background the process (continue using app)
5. Push notification when complete: "Your wardrobe is ready! 22 items added ✨"
6. Error handling: "3 photos failed. Retry or skip?"
7. Final summary: "Added 22 items from 18 photos"

### Story 10.7: Instagram Photo Import (Future V3)

> **As a** user,  
> **I want** to import photos from my Instagram,  
> **so that** I can use my existing outfit photos.

**Acceptance Criteria (Deferred to V3):**
1. "Connect Instagram" OAuth flow
2. Fetch last 50 user photos
3. Filter photos likely containing outfits (full-body poses)
4. Same extraction flow as gallery upload
5. Instagram API compliance (data usage policies)

---

## Epic 11: 📊 Advanced Analytics 2.0

**Goal:** Enhance V1 analytics with sustainability scoring, brand value analysis, and wardrobe gap detection.

### Story 11.1: Cost-Per-Wear Brand Comparison

> **As a** user tracking CPW,  
> **I want** to see which brands give me best value,  
> **so that** I can make smarter future purchases.

**Acceptance Criteria:**
1. "Brand Value" section in Analytics dashboard
2. Table/chart showing: Brand name, Avg CPW, Total spent, Total wears
3. Ranked by best value (lowest avg CPW)
4. Insight: "Your Everlane jeans cost £1.20/wear – great investment!"
5. Filter by category: "Best value sneakers brand"
6. Minimum threshold: 3+ items from brand to appear
7. Charts update in real-time as wear logs added

### Story 11.2: Sustainability Score & Environmental Savings

> **As a** environmentally-conscious user,  
> **I want** to see my environmental impact,  
> **so that** I feel validated for re-wearing clothes.

**Acceptance Criteria:**
1. Sustainability score (0-100) calculated based on:
   - Avg wear count per item (30%)
   - % wardrobe worn in last 90 days (25%)
   - CPW avg (20%)
   - Resale activity (15%)
   - New purchases avoided (10%)
2. Score displayed with leaf icon 🌱 and color gradient
3. "Environmental Savings" metric: "You saved 45kg CO2 by re-wearing vs buying new"
4. Comparison: "Top 15% of Vestiaire users!"
5. Tips to improve score
6. Score recalculated weekly
7. Badge unlocked at ≥80 score: "Eco Warrior"

### Story 11.3: Wardrobe Gap Analysis

> **As a** user,  
> **I want** to know what's missing from my wardrobe,  
> **so that** I can make strategic purchases.

**Acceptance Criteria:**
1. AI analyzes wardrobe for gaps by:
   - Category (e.g., "0 light jackets for 15°C weather")
   - Formality (e.g., "No formal shoes for business events")
   - Color (e.g., "All dark colors, no pastels for spring")
   - Weather (e.g., "No waterproof outerwear")
2. "Wardrobe Gaps" section in Analytics
3. Each gap rated: Critical, Important, Optional
4. Suggestions: "Consider adding a beige trench coat"
5. Link to Shopping Assistant: "Find a trench coat that matches your style"
6. Gaps dismiss able if user disagrees
7. Gaps update as wardrobe changes

### Story 11.4: Seasonal Wardrobe Reports

> **As a** user,  
> **I want** to see how my wardrobe performs each season,  
> **so that** I can prepare for transitions.

**Acceptance Criteria:**
1. Seasonal reports generated: Spring, Summer, Fall, Winter
2. Report shows:
   - Item count per season tag
   - Most worn items this season
   - Neglected items (didn't wear all season)
   - Weather compatibility (did wardrobe match actual weather?)
3. Seasonal readiness score: "Your fall wardrobe: 7/10"
4. Recommendations: "Next fall, add more layers"
5. Historical comparison: "This winter you wore 12% more items than last"
6. Seasonal transition alerts: "Spring starts in 2 weeks. Review your wardrobe."

### Story 11.5: Wear Frequency Heatmap

> **As a** user,  
> **I want** to visualize my wear patterns over time,  
> **so that** I can identify trends.

**Acceptance Criteria:**
1. Calendar heatmap showing daily wear activity
2. Color intensity = number of items worn that day
3. View modes: Month, Quarter, Year
4. Hover/tap day to see outfits worn
5. Insights: "You logged outfits 18 days this month"
6. Streak tracking visible on heatmap
7. Empty days highlighted for easy spotting

---

## Epic 12: 📅 Calendar Integration & Outfit Planning

**Goal:** Integrate with user's calendar to provide proactive outfit suggestions for upcoming events, reducing morning decision fatigue.

### Story 12.1: Calendar Permission & Connection

> **As a** user,  
> **I want** to connect my phone calendar,  
> **so that** the app can suggest outfits for my events.

**Acceptance Criteria:**
1. "Connect Calendar" in Settings
2. iOS: EventKit permission request
3. Android: Google Calendar OAuth
4. Permission explanation: "We'll suggest outfits for your meetings and events"
5. User selects which calendars to include (work, personal, etc.)
6. Calendar sync status displayed
7. Option to disconnect at any time

### Story 12.2: Event Detection & Classification

> **As a** system,  
> **I want** to detect and classify calendar events,  
> **so that** outfit suggestions are contextually appropriate.

**Acceptance Criteria:**
1. Fetch today's and next 7 days' events
2. AI classifies event based on title/description:
   - Work: meeting, presentation, interview
   - Social: dinner, party, date, drinks
   - Active: gym, hike, sports
   - Formal: wedding, gala, funeral
   - Casual: brunch, coffee, errands
3. Formality score assigned (1-10)
4. Events stored with classification in `calendar_events` table
5. Re-classification option if AI wrong
6. All-day events handled (suggest casual by default)

### Story 12.3: Event-Based Outfit Suggestions

> **As a** user with upcoming events,  
> **I want** to see outfit suggestions for each event,  
> **so that** I can plan what to wear.

**Acceptance Criteria:**
1. Home screen shows: "Upcoming: Client Presentation (Formal)"
2. Outfit suggestion generated for formality + weather
3. Event time considered: "Tonight's dinner → evening-appropriate outfit"
4. Multiple events in one day: prioritize highest formality
5. "See All Events" shows next 7 days with suggestions
6. Regenerate button for each event
7. Outfit automatically considers weather forecast for event time

### Story 12.4: Outfit Scheduling & Planning

> **As a** user who plans ahead,  
> **I want** to schedule outfits for future days,  
> **so that** I'm prepared all week.

**Acceptance Criteria:**
1. "Plan Week" screen shows 7-day calendar
2. Each day shows events and weather preview
3. Tap day to assign/create outfit
4. Planned outfits displayed on calendar
5. Edit/remove scheduled outfits
6. Morning notification includes: "Today's planned outfit: Blue suit + white shirt"
7. Scheduled outfits stored in `calendar_outfits` table

### Story 12.5: Outfit Reminders

> **As a** user,  
> **I want** reminders before events requiring specific attire,  
> **so that** I don't forget preparation (ironing, dry cleaning).

**Acceptance Criteria:**
1. Reminder notification: "Your meeting is tomorrow. Don't forget to iron your shirt 👔"
2. Sent evening before event (default: 8 PM)
3. Only for formal/work events
4. User can snooze or mark as done
5. Configurable: timing, event types
6. Smart tips: "Your blazer is at the dry cleaners. Pick it up today."

### Story 12.6: Travel Mode Packing Suggestions

> **As a** user traveling,  
> **I want** packing suggestions based on my trip calendar,  
> **so that** I bring the right clothes.

**Acceptance Criteria (V2 Simple, V3 Enhanced):**
1. Detect multi-day trip events (e.g., "SF Trip 3/15-3/18")
2. Suggest outfits to pack for each day
3. Consider destination weather forecast
4. Packing list generated: "Pack 3 work outfits, 1 casual"
5. Checklist interface to mark items packed
6. Export packing list to notes/reminder app

---

## Epic 13: ♻️ Circular Resale Triggers

**Goal:** Extend V1 resale features with automated neglect detection and proactive resale prompts to encourage sustainable wardrobe cycling.

### Story 13.1: Enhanced Neglect Detection

> **As a** system,  
> **I want** to track items not worn in 180 days,  
> **so that** resale prompts can be triggered.

**Acceptance Criteria:**
1. Neglect threshold configurable (default: 180 days)
2. `items` table includes: last_worn_date, neglect_status (boolean)
3. Daily cron job updates neglect_status for all users
4. Neglect badge displayed on item cards
5. "Neglected Items" filter in wardrobe gallery
6. Analytics show: "15% of your wardrobe is neglected (12 items)"

### Story 13.2: Resale Prompt Notifications

> **As a** user with neglected items,  
> **I want** to be notified to consider selling,  
> **so that** I can keep my wardrobe fresh and earn money.

**Acceptance Criteria:**
1. Monthly notification: "You haven't worn your black heels in 6 months. Sell on Vinted for £25?"
2. Notification includes: item image, estimated sale price
3. Tap opens item detail with "Create Listing" button
4. Estimated price based on: brand, condition, original price
5. Notification frequency: max 1/month per item
6. User can dismiss: "I'll keep it" (pauses prompts)
7. Dismiss all resale prompts option in settings

### Story 13.3: One-Tap Resale Listing

> **As a** user ready to sell,  
> **I want** to generate a listing instantly,  
> **so that** I can list on Vinted/Depop quickly.

**Acceptance Criteria:**
1. Reuse V1 AI listing generator
2. Enhanced prompt includes: wear count, CPW, last worn date
3. Listing includes sustainability angle: "Loved and well-cared for"
4. Copy to clipboard or share directly to Vinted/Depop
5. Mark item as "Listed for resale" in wardrobe
6. Track resale activity for analytics
7. "Resale Success" metric: £ earned from sold items

### Story 13.4: Wardrobe Health Score

> **As a** user,  
> **I want** to see my wardrobe's "health",  
> **so that** I know if I should declutter.

**Acceptance Criteria:**
1. Health score (0-100) based on:
   - % items worn in 90 days (50%)
   - % items with <£5 CPW (30%)
   - Wardrobe size vs utilization ratio (20%)
2. Score displayed on Analytics dashboard
3. Color coded: Green (80-100), Yellow (50-79), Red (<50)
4. Recommendations: "Declutter 8 items to improve health"
5. Comparison: "Healthier than 60% of users"
6. "Spring Clean" mode: guided declutter flow

### Story 13.5: Resale History & Earnings Tracker

> **As a** user who sells items,  
> **I want** to track what I've sold and earnings,  
> **so that** I see the value of circular fashion.

**Acceptance Criteria:**
1. "Resale History" section in Profile
2. List of items marked as sold with sale price
3. Total earnings displayed: "You've earned £ 245 from resales"
4. Chart: earnings over time
5. Sustainability metric: "You kept 12 items out of landfills"
6. Link sold items back to original wardrobe entry
7. Badge: "Circular Champion" for selling 10+ items

### Story 13.6: Donation Tracking

> **As a** user who donates,  
> **I want** to track donations separate from sales,  
> **so that** I log my charitable activity.

**Acceptance Criteria:**
1. "Mark as Donated" option on neglected items
2. Donation log: item, charity/org, date, estimated value
3. Tax deduction summary (US users): "£180 donated this year"
4. Sustainability impact: "You donated 8kg of clothing"
5. Donation history in Profile
6. Badge: "Generous Giver" for donating 20+ items

---

## Next Steps

### Immediate Priorities
1. **Database Migrations:** Create new tables for V2 features (`shopping_scans`, `shopping_wishlists`, `ootd_posts`, `friendships`, `style_squads`, `wardrobe_extraction_jobs`, `calendar_outfits`)
2. **Prototype URL Scraper:** Test scraping Zara, H&M, ASOS for product data
3. **Gemini Photo Extraction Test:** Validate accuracy on 50 sample photos (target ≥85%)
4. **Design V2 Screens:** Shopping Assistant, OOTD feed, AI extraction review UI
5. **User Research:** Survey V1 users on V2 feature reception

### Development Roadmap (5 Months)

**Month 1: Foundation**
- Epic 10: AI Wardrobe Extraction (Stories 10.1-10.6)
- Database schema for all V2 epics
- Gemini API quota increase request

**Month 2-3: Core Features**
- Epic 8: Shopping Assistant (Stories 8.1-8.8)
- Epic 9: Social OOTD (Stories 9.1-9.6)
- URL scraper implementation
- Background removal integration

**Month 4: Enhanced Features**
- Epic 11: Advanced Analytics 2.0 (Stories 11.1-11.5)
- Epic 12: Calendar Integration (Stories 12.1-12.5)
- Epic 13: Circular Resale Triggers (Stories 13.1-13.6)

**Month 5: Polish & Launch**
- Internal testing & bug fixes
- Beta launch to V1 users
- Performance optimization
- Public launch (App Store update)

---

**Document Status:** Final  
**Version:** 2.0  
**Owner:** Product Team  
**Last Updated:** February 9, 2026
