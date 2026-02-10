# Epic 5: 📊 Wardrobe Analytics

**Goal:** Deliver actionable wardrobe insights that help users understand their clothing usage patterns through cost-per-wear tracking and neglected items detection.

---

## Story 5.1: Wear Logging System

> **As a** user,  
> **I want** to log which items I wear each day,  
> **so that** the app can track my clothing usage.

### Acceptance Criteria

1. "Log Today's Outfit" button accessible from Home screen
2. Quick selection: tap items worn today from wardrobe grid
3. Or: select a saved outfit as "worn today"
4. Wear log stored: user_id, item_id, date, outfit_id (optional)
5. Can log multiple times per day (different occasions)
6. Can edit/delete past wear logs
7. Visual confirmation: "Logged! 👗" animation

---

## Story 5.2: Evening Reminder Notification

> **As a** user,  
> **I want** an evening reminder to log my outfit,  
> **so that** I don't forget to track what I wore.

### Acceptance Criteria

1. Push notification at user-configurable time (default 8 PM)
2. Notification: "What did you wear today? Log your outfit! 📝"
3. Tap opens app to wear logging screen
4. Notification skipped if outfit already logged today
5. User can disable in settings
6. Smart timing: not sent if app was opened recently

---

## Story 5.3: Cost-Per-Wear Calculation

> **As a** user,  
> **I want** to see the cost-per-wear for each item,  
> **so that** I understand the value I'm getting from my clothes.

### Acceptance Criteria

1. CPW calculated: purchase_price / wear_count
2. CPW displayed on item detail screen
3. CPW badge on wardrobe gallery cards
4. Color coding: green (<£5), yellow (£5-20), red (>£20)
5. Items without price show "Add price to track CPW"
6. CPW updates in real-time after each wear log
7. Celebration when CPW drops below threshold

---

## Story 5.4: Neglected Items Detection

> **As a** user,  
> **I want** to see which items I haven't worn recently,  
> **so that** I can rediscover forgotten clothes or consider selling them.

### Acceptance Criteria

1. "Neglected" filter in wardrobe gallery
2. Neglected = not worn in 60+ days (configurable)
3. Neglected items highlighted with badge/icon
4. Analytics dashboard shows count of neglected items
5. Suggestion: "5 items haven't been worn in 2 months"
6. Quick action: "Suggest outfit with this item"
7. Quick action: "Create resale listing" (links to Epic 7)

---

## Story 5.5: Most Worn Items Leaderboard

> **As a** user,  
> **I want** to see my most-worn items,  
> **so that** I know which clothes I truly love.

### Acceptance Criteria

1. "Top Worn" section in Analytics dashboard
2. Top 10 items ranked by wear count
3. Visual: podium or ranked list with wear counts
4. Breakdown by category available
5. Time filter: all time, this month, this season
6. Insight: "Your black jeans are your wardrobe MVP! 🏆"

---

## Story 5.6: Wardrobe Analytics Dashboard

> **As a** user,  
> **I want** a dashboard summarizing my wardrobe insights,  
> **so that** I can see usage patterns at a glance.

### Acceptance Criteria

1. Dashboard accessible from Profile tab
2. Summary cards: Total items, Total value, Avg CPW
3. Chart: Wardrobe distribution by category (pie/donut)
4. Chart: Wear frequency over time (last 30 days)
5. Insights section: AI-generated tips based on data
6. "Neglected items" count with link to filter
7. "Sustainability score" placeholder (for Epic 6)

---

## Story 5.7: Wear Calendar View

> **As a** user,  
> **I want** to see a calendar of what I wore each day,  
> **so that** I can review my outfit history.

### Acceptance Criteria

1. Monthly calendar view in Analytics section
2. Days with logged outfits show thumbnail/dot indicator
3. Tap day to see outfit worn that day
4. Multiple outfits per day supported
5. Navigate between months
6. Empty days show "No outfit logged"
7. Stats: "You logged 18 outfits this month"
