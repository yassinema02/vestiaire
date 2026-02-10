# Epic 7: ♻️ Resale Integration

**Goal:** Enable users to easily create resale listings for unused items, turning neglected clothes into value. Also implements freemium/premium tier differentiation.

---

## Story 7.1: Resale Candidate Identification

> **As a** user,  
> **I want** to see which items are good candidates for resale,  
> **so that** I know what to consider selling.

### Acceptance Criteria

1. "Ready to Sell" section on Analytics dashboard
2. Algorithm identifies: items not worn in 90+ days, high CPW items
3. Items ranked by "resale potential" score
4. Quick filter in wardrobe: "Resale Candidates"
5. Nudge notification: "You have 3 items you haven't worn in 3 months"
6. CTA: "Create listing" button on candidate items

---

## Story 7.2: AI Listing Generator

> **As a** user,  
> **I want** the app to generate a resale listing description,  
> **so that** I can quickly list items on Vinted without writing.

### Acceptance Criteria

1. "Generate Listing" action on item detail screen
2. AI generates: title, description, suggested category, condition guess
3. Uses item metadata: brand, color, category, photos
4. Description optimized for Vinted format and SEO
5. Multiple description style options: casual, detailed, minimal
6. User can edit generated text before copying
7. Generation takes <5 seconds

### Example Output

```
Title: Zara Navy Blue Wool Coat - Size M

Description: Beautiful navy blue wool-blend coat from Zara. 
Perfect for autumn/winter. Barely worn, excellent condition. 
Classic cut that pairs with everything from jeans to dresses.
Size M, true to size.

Category: Women > Coats > Wool Coats
Condition: Very Good
```

---

## Story 7.3: Listing Copy & Share

> **As a** user,  
> **I want** to copy my listing and share it to Vinted,  
> **so that** I can post my item for sale.

### Acceptance Criteria

1. "Copy to Clipboard" button copies full listing text
2. "Share" button opens system share sheet
3. Direct "Open in Vinted" button (if Vinted app installed)
4. Success confirmation: "Copied! Paste in Vinted to list"
5. Photo export option: save background-removed image to camera roll
6. Tutorial overlay on first use

---

## Story 7.4: Listing History

> **As a** user,  
> **I want** to track items I've created listings for,  
> **so that** I can manage my resale activity.

### Acceptance Criteria

1. "Listings Created" section in Analytics/Profile
2. Shows: item, listing text, date created
3. Status options: Listed, Sold, Cancelled
4. Mark as "Sold" removes item from wardrobe
5. Sold items tracked for lifetime stats
6. Re-generate listing option for unsold items

---

## Story 7.5: Freemium Tier Limits

> **As a** system,  
> **I want** to enforce usage limits for free users,  
> **so that** premium subscriptions have clear value.

### Acceptance Criteria

1. Free tier: 3 AI outfit suggestions per day
2. Free tier: 2 resale listings per month
3. Usage counters displayed in app
4. Soft paywall when limit reached: "Upgrade for unlimited"
5. Countdown timer: "Refreshes in 12 hours"
6. Limits stored in `user_stats` table, reset on schedule
7. Premium users: unlimited everything

---

## Story 7.6: Premium Subscription Flow

> **As a** user,  
> **I want** to upgrade to Premium,  
> **so that** I can access unlimited features.

### Acceptance Criteria

1. "Upgrade to Premium" screen accessible from Profile
2. Clear comparison: Free vs Premium features
3. Price displayed: £4.99/month
4. Apple In-App Purchase integration
5. Subscription managed via App Store
6. Premium badge displayed on profile
7. "Restore Purchases" option for reinstalls
8. Graceful downgrade: features limited, data preserved

### Premium Benefits Comparison

| Feature | Free | Premium |
|---------|------|---------|
| AI outfit suggestions | 3/day | Unlimited |
| Resale listings | 2/month | Unlimited |
| Advanced analytics | Basic | Full |
| Sustainability score | ❌ | ✅ |
| Priority support | ❌ | ✅ |
| Early access features | ❌ | ✅ |

---

## Story 7.7: Premium Onboarding Reward

> **As a** new user who completes "Closet Safari",  
> **I want** to receive 1 month of Premium free,  
> **so that** I can experience the full app value.

### Acceptance Criteria

1. On Closet Safari completion, Premium activated for 30 days
2. No credit card required for trial
3. Countdown displayed: "Premium trial: 23 days remaining"
4. Reminder notification at 7 days and 1 day before expiry
5. Smooth transition back to Free tier if not subscribed
6. Upsell prompt at trial end
