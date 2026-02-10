# Epic 13: ♻️ Circular Resale Triggers

**Goal:** Extend V1 resale features with automated neglect detection and proactive resale prompts to encourage sustainable wardrobe cycling.

---

## Story 13.1: Enhanced Neglect Detection

> **As a** system,  
> **I want** to track items not worn in 180 days,  
> **so that** resale prompts can be triggered.

### Acceptance Criteria

1. Neglect threshold configurable (default: 180 days)
2. `items` table includes: last_worn_date, neglect_status (boolean)
3. Daily cron job updates neglect_status for all users
4. Neglect badge displayed on item cards
5. "Neglected Items" filter in wardrobe gallery
6. Analytics show: "15% of your wardrobe is neglected (12 items)"

---

## Story 13.2: Resale Prompt Notifications

> **As a** user with neglected items,  
> **I want** to be notified to consider selling,  
> **so that** I can keep my wardrobe fresh and earn money.

### Acceptance Criteria

1. Monthly notification: "You haven't worn your black heels in 6 months. Sell on Vinted for £25?"
2. Notification includes: item image, estimated sale price
3. Tap opens item detail with "Create Listing" button
4. Estimated price based on: brand, condition, original price
5. Notification frequency: max 1/month per item
6. User can dismiss: "I'll keep it" (pauses prompts)
7. Dismiss all resale prompts option in settings

---

## Story 13.3: One-Tap Resale Listing

> **As a** user ready to sell,  
> **I want** to generate a listing instantly,  
> **so that** I can list on Vinted/Depop quickly.

### Acceptance Criteria

1. Reuse V1 AI listing generator
2. Enhanced prompt includes: wear count, CPW, last worn date
3. Listing includes sustainability angle: "Loved and well-cared for"
4. Copy to clipboard or share directly to Vinted/Depop
5. Mark item as "Listed for resale" in wardrobe
6. Track resale activity for analytics
7. "Resale Success" metric: £ earned from sold items

---

## Story 13.4: Wardrobe Health Score

> **As a** user,  
> **I want** to see my wardrobe's "health",  
> **so that** I know if I should declutter.

### Acceptance Criteria

1. Health score (0-100) based on:
   - % items worn in 90 days (50%)
   - % items with <£5 CPW (30%)
   - Wardrobe size vs utilization ratio (20%)
2. Score displayed on Analytics dashboard
3. Color coded: Green (80-100), Yellow (50-79), Red (<50)
4. Recommendations: "Declutter 8 items to improve health"
5. Comparison: "Healthier than 60% of users"
6. "Spring Clean" mode: guided declutter flow

---

## Story 13.5: Resale History & Earnings Tracker

> **As a** user who sells items,  
> **I want** to track what I've sold and earnings,  
> **so that** I see the value of circular fashion.

### Acceptance Criteria

1. "Resale History" section in Profile
2. List of items marked as sold with sale price
3. Total earnings displayed: "You've earned £245 from resales"
4. Chart: earnings over time
5. Sustainability metric: "You kept 12 items out of landfills"
6. Link sold items back to original wardrobe entry
7. Badge: "Circular Champion" for selling 10+ items

---

## Story 13.6: Donation Tracking

> **As a** user who donates,  
> **I want** to track donations separate from sales,  
> **so that** I log my charitable activity.

### Acceptance Criteria

1. "Mark as Donated" option on neglected items
2. Donation log: item, charity/org, date, estimated value
3. Tax deduction summary (US users): "£180 donated this year"
4. Sustainability impact: "You donated 8kg of clothing"
5. Donation history in Profile
6. Badge: "Generous Giver" for donating 20+ items
