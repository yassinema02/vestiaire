# Project Brief: Vestiaire V2 (Revised)

**Version:** 2.1 (Focused)  
**Date:** February 9, 2026  
**Status:** Planning Phase

---

## Executive Summary

Vestiaire V2 transforms personal wardrobe management into a **smart shopping companion** and **social style community**. By focusing on three core pillars—**intelligent shopping assistance**, **private social sharing**, and **frictionless onboarding**—V2 creates a sustainable revenue model through affiliate commissions while dramatically improving user engagement.

**Killer Feature:** "Check Before You Buy" assistant uses AI to analyze screenshots or URLs of products and show instant wardrobe compatibility, helping users make smarter shopping decisions.

**Magic Moment:** AI Wardrobe Extraction lets users populate their entire digital closet in minutes by uploading existing photos (Instagram, selfies, gallery).

**Target Market:** Fashion-conscious millennials and Gen Z (18-35) who want to maximize wardrobe value, avoid buyer's remorse, and share style with friends.

**Key Value Proposition:** The only fashion app that prevents wasteful purchases by showing exactly how new items fit with your existing wardrobe—before you buy.

---

## Problem Statement

### Current State and Pain Points

1. **Shopping Regret is Epidemic**
   - **60% of clothing purchased** is rarely or never worn (ThredUp, 2024)
   - **$200-400 wasted annually** per person on impulse buys
   - "Will this work with what I own?" is unanswered until after purchase

2. **Manual Wardrobe Entry is a Barrier**
   - Photographing every item individually takes hours
   - Users give up after adding 5-10 items
   - 70% of app downloads never complete onboarding

3. **Social Fashion is Too Public or Too Private**
   - Instagram is performative (not authentic daily sharing)
   - Group chats lack context (can't see items in outfit)
   - No middle ground between "influencer" and "nothing"

4. **Wardrobe Data is Underutilized**
   - V1 collects rich data but doesn't surface insights proactively
   - Users don't know which brands give best value
   - Environmental impact invisible

5. **Reactive, Not Proactive**
   - Users scramble each morning
   - Calendar events (meetings, dates) not considered
   - Weather changes catch users unprepared

### Impact (Quantified)

- **$240 billion** wasted annually on unworn clothes globally (McKinsey, 2023)
- **Average user** keeps only 20% of their wardrobe in active rotation
- **40% of online returns** due to "doesn't match my style" (Narvar, 2024)
- **85% of consumers** want pre-purchase decision support (Google, 2025)

### Urgency

- **Social commerce** growing 30% YoY ($1.2T market by 2025)
- **AI shopping assistants** becoming table stakes (Google Lens, Pinterest Lens both launched 2023-2024)
- **First-mover advantage** in personal-wardrobe-integrated shopping before big tech dominates

---

## Proposed Solution

### Core Concept

Vestiaire V2 creates a **smart wardrobe operating system** that:
1. **Prevents wasteful purchases** with AI-powered compatibility checks
2. **Automates wardrobe digitization** using existing photos
3. **Builds private style communities** for daily outfit sharing
4. **Proactively suggests outfits** based on calendar and weather
5. **Encourages sustainable choices** through resale triggers

### Key Differentiators

1. **Pre-Purchase Intelligence** - Unlike Pinterest/Google Lens, Vestiaire checks compatibility with **your specific wardrobe**
2. **Zero-Friction Onboarding** - Instagram/photo import vs. manual item entry
3. **Private Social** - Style Squads (not influencer feeds)
4. **Revenue-Aligned** - Affiliate commissions from shopping (not subscriptions)
5. **Circular Integration** - Resale triggers keep wardrobes fresh

### Why This Will Succeed

- **V1 foundation** - Proven wardrobe digitization, AI, and user engagement
- **Affiliate revenue** - Users buy through our recommendations
- **Network effects** - Social features create viral loops
- **Sustainable** - Reduces fashion waste (ESG appeal)

---

## Target Users

### Primary User Segment: Fashion-Conscious Shoppers (22-35)

**Demographics:**
- Age: 22-35
- Gender: 70% female, 30% male
- Income: $40K-$100K
- Location: Urban/suburban, US/EU markets
- Shop online 3-5x per month, spend $150-400/month on clothes

**Pain Points:**
- Buy clothes that don't match existing wardrobe
- Decision fatigue (30 min to get dressed some mornings)
- Wear same 10 items, ignore the rest
- Want to share style but not be "influencer"

**Goals:**
- Make smarter shopping decisions
- Maximize value from existing wardrobe
- Get daily outfit inspiration from real friends
- Reduce environmental impact

---

## Goals & Success Metrics

### Business Objectives

- **User Growth:** Increase MAU from V1 baseline by **100%** within 6 months
- **Engagement:** **50% of users** share 3+ OOTDs per week
- **Shopping Assistant Usage:** **30% of users** check compatibility before each purchase
- **Onboarding:** **60% of new users** complete wardrobe setup (vs 30% in V1)
- **Value Proof:** **40% reduction** in user-reported "regret purchases"

### User Success Metrics

- **Smarter Shopping:** Users report **40% fewer returns** and regretful purchases
- **Wardrobe Utilization:** **30% increase** in wear frequency of existing items
- **Social Engagement:** Average **12 friends** per user, **4 OOTD checks** per day
- **Time Savings:** Morning outfit decision reduced from **20 min to 5 min**

### Key Performance Indicators (KPIs)

- **Shopping Scans:** 50K "Check Before You Buy" scans per month
- **Scan Success:** 85% of scans result in "useful" compatibility insight (user rating)
- **Shopping Wishlists:** 20K items added to wishlists per month
- **OOTD Posts:** 200K weekly posts (platform-wide)
- **Onboarding Completion:** 60% complete wardrobe setup (10+ items)
- **30-Day Retention:** 70% (up from 58% in V1)

---

## MVP Scope

### Core Features (Must Have)

#### Epic 8: "Check Before You Buy" Shopping Assistant 🛍️ (PRIORITY #1)

**User Story:** "I see a jacket online → I screenshot/paste URL → Vestiaire shows me if it matches my wardrobe"

**Features:**
- **Screenshot/URL Input:** User shares screenshot OR pastes product URL
- **AI Product Extraction:** Gemini identifies the product (name, color, style, brand)
- **Compatibility Score:** AI calculates fit with existing wardrobe (e.g., "85% Match - Great Choice!")
- **Matching Items:** Shows user's items that pair well ("Goes with your blue jeans, white tee, black boots")
- **Virtual Outfit Preview:** Displays outfit combination mockup
- **Style Feedback:** AI explains why it matches or doesn't ("This green clashes with your warm-toned wardrobe")
- **Save to Wishlist:** Add to "Shopping Wishlist" for future consideration
- **Gap Analysis:** "You don't have shoes that match this dress. Consider adding black heels."

**Rationale:** Solves #1 pain point (shopping uncertainty). Proves value before adding monetization in V3. Builds trust and habit.

**Tech:** Gemini 1.5 Pro (multimodal), Supabase Edge Functions, URL scraper for product images

---

#### Epic 9: Social OOTD Feed 📸 (ENGAGEMENT DRIVER)

**User Story:** "I share my outfit daily with my close friends, get inspired by their style"

**Features:**
- **Private Style Squads:** Friend groups of 10-20 people (like BeReal)
- **Daily OOTD Posts:** Photo + tagged wardrobe items
- **Feed:** Chronological, friends-only
- **Comments & Reactions:** Like, comment, save outfit
- **Item View:** Click outfit → see which items from user's wardrobe
- **Outfit Inspiration:** "Steal This Look" - recreate friend's outfit with your items

**Rationale:** Daily habit formation. Social validation drives engagement. Network effects (invite friends to see your OOTD).

**Tech:** Supabase Realtime, React Native Camera, Image tagging

---

#### Epic 10: AI Wardrobe Extraction ✨ (MAGIC ONBOARDING)

**User Story:** "I upload 20 Instagram photos → AI populates my entire wardrobe in 2 minutes"

**Features:**
- **Photo Bulk Upload:** Select from gallery, Instagram, or camera roll
- **AI Multi-Item Detection:** Gemini identifies all clothing items in each photo
- **Automatic Categorization:** AI assigns category, color, style, material
- **Background Removal:** Each item isolated with clean background
- **Review & Edit:** User confirms/adjusts AI detections
- **Instant Wardrobe:** Wardrobe populated in minutes, not hours

**Rationale:** **Removes #1 onboarding barrier**. Creates "wow" moment. Users can start using app immediately instead of spending hours photographing items.

**Tech:** Gemini 1.5 Pro (vision), Remove.bg API, Supabase Storage

---

#### Epic 11: Advanced Analytics & Sustainability 📊

**User Story:** "I see which brands give me best value, how much I've saved by re-wearing vs buying new"

**Features:**
- **Cost-Per-Wear 2.0:** Brand comparison dashboard
- **Sustainability Score:** "You saved 45kg CO2 by re-wearing instead of buying"
- **Wardrobe Gaps:** "You need light jackets for 15°C weather"
- **Most/Least Worn:** Insights on wardrobe utilization
- **Value Report:** "Your best investment: Everlane jeans (34 wears, £1.50/wear)"

**Rationale:** Enhances V1 features. Builds brand loyalty through data insights. Supports sustainable mindset.

**Tech:** Expand V1 analytics, CO2 calculation API

---

#### Epic 12: Smart Calendar Integration 📅

**User Story:** "Tuesday: business meeting + rain forecast → App suggests professional, waterproof outfit"

**Features:**
- **Calendar Sync:** iOS/Android calendar API integration
- **Event Detection:** Identify event types (meeting, date, workout, travel)
- **Weather Awareness:** Check forecast for event time
- **Proactive Suggestions:** "Tomorrow 9am: Client presentation. Wear your navy blazer + white shirt."
- **Planning Mode:** Schedule outfits for week ahead
- **Reminders:** "Don't forget to iron your shirt for tomorrow"

**Rationale:** Reduces morning decision fatigue. Moves from reactive to proactive. Increases daily app opens.

**Tech:** iOS Calendar API, Weather API (existing), push notifications

---

#### Epic 13: Circular Resale Triggers ♻️

**User Story:** "App alerts me when item hasn't been worn in 6 months → I list it on Vinted instantly"

**Features:**
- **Neglect Detection:** Track items not worn in 180 days
- **Resale Notifications:** "Sell this on Vinted for £25?"
- **One-Tap Listing:** Pre-filled Vinted listing (reuse V1 AI generator)
- **Wardrobe Health:** "15% of your wardrobe is neglected"
- **Sell History:** Track resale success, money earned

**Rationale:** Extends V1 resale features. Keeps wardrobes fresh. Circular economy alignment.

**Tech:** Extend V1 resale listing generator, Vinted deep links

---

### Out of Scope for MVP

- AR virtual try-on (cut from V2)
- Professional stylist marketplace (cut from V2)
- Public influencer mode (private only)
- Video OOTDs (photos only)
- In-app purchases of clothing
- Multi-language support (English only)
- Android offline mode

### MVP Success Criteria

**MVP is successful if:**
1. **25% of users** use Shopping Assistant at least once within 30 days
2. **40% of users** complete onboarding via AI Wardrobe Extraction
3. **35% of users** share 3+ OOTDs per week
4. **Users rate Shopping Assistant** ≥ 4.2/5 stars for helpfulness
5. **Net Promoter Score (NPS) ≥ 45**
6. **30% of users** report "avoided a regret purchase" thanks to the app

---

## Post-MVP Vision

### Phase 2 Features (3-6 months post-launch)

- **Brand Partnerships:** Featured shopping collections from sustainable brands
- **Group Trip Planning:** Collaborative outfit packing for group travel
- **Video OOTDs:** Short video outfit posts (TikTok-style)
- **Shopping Challenges:** "30-Day No Buy Challenge" with friends
- **Android Version:** Expand beyond iOS
- **AI Style Coach:** Personalized styling tips based on wardrobe data

### Long-term Vision (1-2 years)

Vestiaire becomes **"The Operating System for Your Closet"**:

- **Smart Home Integration:** RFID tags for automatic wear tracking
- **Voice Assistant:** "Alexa, what should I wear today?"
- **B2B Licensing:** Sell Shopping Assistant tech to retailers
- **Carbon Credits:** Partner with carbon offset programs
- **Fashion Rental:** Try outfits from Rent the Runway, integrated

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** iOS (native), web (responsive), Android (Phase 2)
- **iOS Requirements:** iOS 15+, iPhone 8 or newer
- **Performance:**
  - Shopping scan analysis: <5 seconds
  - Photo upload batch: 20 photos in <30 seconds
  - OOTD feed load: <2 seconds
  - AI extraction: <10 seconds per photo

### Technology Stack

**Frontend:**
- React Native (existing V1)
- Expo Router (existing)
- React Native Camera

**Backend:**
- Supabase (existing) - Database, auth, storage
- Supabase Edge Functions - AI processing
- Realtime subscriptions for social feed

**AI/ML:**
- **Google Gemini 1.5 Pro** (existing integration)
  - Screenshot product extraction
  - Photo wardrobe extraction
  - Outfit compatibility analysis
- Remove.bg API (background removal)

**External APIs:**
- **Calendar:** iOS/Android Calendar API
- **Weather:** WeatherAPI.com (existing)
- **URL Scraper:** Cheerio/Puppeteer for product page parsing
- **Product Data:** Open Graph meta tags, schema.org markup

**Database Schema (New Tables):**
```sql
- shopping_scans (screenshot/URL analysis history)
- shopping_wishlists (saved items for future consideration)
- ootd_posts (social feed)
- friendships (social connections)
- style_squads (friend groups)
- wardrobe_extraction_jobs (bulk photo processing)
- calendar_outfits (scheduled outfits)
```

---

## Constraints & Assumptions

### Constraints

- **Budget:** $10K for V2 development (reduced without affiliate integration)
- **Timeline:** 4-5 months to MVP (August 2026 launch)
- **Resources:**
  - 1 full-time developer (you)
  - Part-time designer (UI/UX for social features)
- **Technical:**
  - Gemini API rate limits (may need quota increase for photo extraction)
  - iOS Calendar API privacy permissions
  - URL scraping may be blocked by some sites (Cloudflare, bot detection)

### Key Assumptions

- **V1 users will adopt V2 features** (30% adoption target)
- **Users will share screenshots/URLs** (Shopping Assistant depends on this behavior)
- **Friends will join** (viral coefficient ≥1.1 for social features)
- **Users comfortable with AI photo analysis** (privacy policy transparency)
- **Shopping Assistant provides value** without monetization ("helped me decide" ≥ 4.2/5 rating)

---

## Risks & Open Questions

### Key Risks

- **Shopping Assistant Engagement:** Users may not use the feature regularly. **Mitigation:** Push notifications when browsing shopping apps, gamification (badges for "smart decisions").
  
- **Photo Extraction Accuracy:** AI may miss items or misclassify. **Mitigation:** Human review step, allow edits, continuous model improvement.
  
- **Social Cold Start:** Users won't invite friends. **Mitigation:** Incentivize (unlock features after 3 friends), showcase value immediately.
  
- **Privacy Concerns:** Users hesitant to upload Instagram photos. **Mitigation:** Transparent privacy policy, local processing where possible, easy deletion.

- **Competitor Response:** Pinterest/Google may copy Shopping Assistant. **Mitigation:** Speed to market, focus on personal wardrobe integration.

### Open Questions

- Best UI flow for screenshot vs URL input? (separate buttons or smart detection?)
- Optimal OOTD posting time/notification strategy? (BeReal uses random times)
- Should Shopping Assistant show price comparison across sites?
- How do we verify user owns items they tag in OOTD? (prevent spam)
- When to introduce monetization in V3? (after 6 months? 12 months?)

### Areas Needing Further Research

- **URL Scraping Reliability:** Test scraping on top 20 shopping sites (Zara, H&M, ASOS, etc.)
- **Photo Extraction Benchmarking:** Test Gemini accuracy on 100 sample photos
- **Instagram API Access:** Verify if we can access user photos (or just gallery upload)
- **User Privacy Research:** Survey V1 users on comfort with photo analysis
- **Competitor Shopping Features:** Analyze Pinterest Lens, Google Lens workflows

---

## Implementation Roadmap

### Month 1: Foundation & Planning

**Week 1-2: Architecture & Design**
- [ ] Finalize database schema (shopping_scans, ootd_posts, etc.)
- [ ] Design UI/UX for Shopping Assistant flow
- [ ] Design OOTD feed and posting interface
- [ ] Apply to affiliate networks (ShareASale, CJ, brand-direct)

**Week 3-4: Setup & Infrastructure**
- [ ] Create Supabase migrations for new tables
- [ ] Set up Gemini 1.5 Pro API access (increase quota)
- [ ] Integrate Remove.bg API
- [ ] Set up affiliate tracking (Branch.io or custom UTM)

### Month 2-3: Core Feature Development

**Epic 10: AI Wardrobe Extraction** (Priority: Onboarding)
- [ ] Photo upload UI (bulk select from gallery)
- [ ] Gemini multi-item detection prompt engineering
- [ ] Background removal integration
- [ ] Review/edit interface for AI detections
- [ ] Batch processing queue (handle 20+ photos)

**Epic 8: Shopping Assistant** (Priority: Revenue)
- [ ] Screenshot sharing integration
- [ ] Gemini product extraction from screenshot
- [ ] Compatibility scoring algorithm
- [ ] Matching items lookup
- [ ] Virtual outfit preview mockup
- [ ] Affiliate link generation + tracking
- [ ] "Shopping Wishlist" feature

**Epic 9: Social OOTD Feed** (Priority: Engagement)
- [ ] OOTD posting flow (camera, item tagging)
- [ ] Feed UI (Realtime subscriptions)
- [ ] Friend invite system
- [ ] Style Squads creation
- [ ] Comments & reactions

### Month 4: Enhanced Features

**Epic 11: Advanced Analytics**
- [ ] CPW 2.0 dashboard
- [ ] Sustainability score calculation
- [ ] Wardrobe gaps AI analysis

**Epic 12: Calendar Integration**
- [ ] iOS Calendar API integration
- [ ] Event detection logic
- [ ] Proactive outfit suggestions
- [ ] Planning mode UI

**Epic 13: Circular Resale**
- [ ] Neglect detection algorithm
- [ ] Resale notifications
- [ ] One-tap Vinted listing (extend V1)

### Month 5: Testing & Launch

**Week 1-2: Internal Testing**
- [ ] Alpha test with 10 users
- [ ] Fix critical bugs
- [ ] Performance optimization (photo processing speed)

**Week 3: Beta Launch**
- [ ] Invite V1 users to V2 beta
- [ ] Collect feedback on Shopping Assistant
- [ ] Monitor affiliate link clicks

**Week 4: Public Launch**
- [ ] App Store submission (V2 update)
- [ ] Marketing push (TikTok, Instagram)
- [ ] Press outreach (TechCrunch, Vogue)

---

## Cost-Benefit Analysis

### Development Costs (5 Months)

| Item | Cost |
|------|------|
| Developer time (you) | $0 (sweat equity) |
| Part-time designer (2 months) | $4,000 |
| Gemini API (photo extraction) | $500/month × 5 = $2,500 |
| Remove.bg API | $100/month × 5 = $500 |
| **Total 5-Month Cost** | **$7,000** |

### Ongoing Monthly Costs (Year 1)

| Item | Cost/Month |
|------|------------|
| Gemini API (10K users) | $1,000 |
| Remove.bg API | $200 |
| Supabase (existing) | $25 |
| **Total Monthly** | **$1,225** |

### V2 Strategy: Prove Value First

**V2 Approach (No Monetization):**
- Focus on **engagement and user value**
- Build habit and trust with Shopping Assistant
- Collect user feedback on compatibility analysis
- Prove users make better purchase decisions

**Metrics to Track:**
- Shopping Assistant usage: 30% of users, 2-3 scans/week
- User satisfaction: ≥ 4.2/5 stars for "helped me decide"
- Avoided regret purchases: 30% of users report benefit
- Wishlist additions: 20K items/month

**V3 Monetization (12 Months Later):**

Once proven valuable, add revenue streams:

**Option 1: Affiliate Links**
- Add "Buy Now" buttons to Shopping Assistant
- Earn 8% commission on purchases
- Projected: $25K-$40K/month

**Option 2: Premium Features**
- Free: 3 shopping scans/week
- Premium ($4.99/month): Unlimited scans, price tracking, multi-site comparison
- Projected: 10% conversion = 2K subscribers × $5 = $10K/month

**Option 3: Brand Partnerships**
- Featured collections from sustainable brands
- Sponsored "Similar Items" suggestions
- Projected: $5K-$15K/month

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Finalize V2 scope** - Review this brief, confirm priorities
2. **Prototype URL scraping** - Test extracting product data from Zara, H&M, ASOS
3. **Design MVP screens** - Shopping Assistant, OOTD Feed, AI Extraction flows
4. **Create V2 PRD** - Detailed user stories, acceptance criteria
5. **Prototype Gemini photo extraction** - Test accuracy on 50 sample photos

### Next 30 Days

1. **Database migrations** - Create new tables for V2 features
2. **AI Wardrobe Extraction prototype** - Test Gemini multi-item detection
3. **URL scraper implementation** - Build robust product data extraction
4. **Shopping Assistant MVP** - Screenshot/URL → product extraction → compatibility score
5. **User research** - Survey V1 users on V2 features

---

## Appendix: V2 vs V1 Feature Comparison

| Feature | V1 Status | V2 Enhancement |
|---------|-----------|----------------|
| Wardrobe Digitization | Manual photo entry | **AI photo extraction** (bulk upload) |
| Outfit Suggestions | AI daily suggestions | **Shopping Assistant** (screenshot/URL compatibility) |
| Social Sharing | ❌ None | **OOTD Feed** (private Style Squads) |
| Analytics | Basic CPW, wear count | **Advanced CPW, sustainability score, gaps** |
| Resale | AI listing generator | **Proactive neglect triggers** |
| Calendar | ❌ None | **Proactive outfit planning** |
| Revenue | Freemium trial (limited success) | **V2: None** (defer to V3) |

---

**Document Status:** Final (Revised)  
**Next Review:** After affiliate network approval  
**Owner:** Yassine (Product Lead)  
**Analyst:** Mary (Business Analyst)
