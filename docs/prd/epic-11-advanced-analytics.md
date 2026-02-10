# Epic 11: 📊 Advanced Analytics 2.0

**Goal:** Enhance V1 analytics with sustainability scoring, brand value analysis, and wardrobe gap detection.

---

## Story 11.1: Cost-Per-Wear Brand Comparison

> **As a** user tracking CPW,  
> **I want** to see which brands give me best value,  
> **so that** I can make smarter future purchases.

### Acceptance Criteria

1. "Brand Value" section in Analytics dashboard
2. Table/chart showing: Brand name, Avg CPW, Total spent, Total wears
3. Ranked by best value (lowest avg CPW)
4. Insight: "Your Everlane jeans cost £1.20/wear – great investment!"
5. Filter by category: "Best value sneakers brand"
6. Minimum threshold: 3+ items from brand to appear
7. Charts update in real-time as wear logs added

---

## Story 11.2: Sustainability Score & Environmental Savings

> **As a** environmentally-conscious user,  
> **I want** to see my environmental impact,  
> **so that** I feel validated for re-wearing clothes.

### Acceptance Criteria

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

---

## Story 11.3: Wardrobe Gap Analysis

> **As a** user,  
> **I want** to know what's missing from my wardrobe,  
> **so that** I can make strategic purchases.

### Acceptance Criteria

1. AI analyzes wardrobe for gaps by:
   - Category (e.g., "0 light jackets for 15°C weather")
   - Formality (e.g., "No formal shoes for business events")
   - Color (e.g., "All dark colors, no pastels for spring")
   - Weather (e.g., "No waterproof outerwear")
2. "Wardrobe Gaps" section in Analytics
3. Each gap rated: Critical, Important, Optional
4. Suggestions: "Consider adding a beige trench coat"
5. Link to Shopping Assistant: "Find a trench coat that matches your style"
6. Gaps dismissable if user disagrees
7. Gaps update as wardrobe changes

---

## Story 11.4: Seasonal Wardrobe Reports

> **As a** user,  
> **I want** to see how my wardrobe performs each season,  
> **so that** I can prepare for transitions.

### Acceptance Criteria

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

---

## Story 11.5: Wear Frequency Heatmap

> **As a** user,  
> **I want** to visualize my wear patterns over time,  
> **so that** I can identify trends.

### Acceptance Criteria

1. Calendar heatmap showing daily wear activity
2. Color intensity = number of items worn that day
3. View modes: Month, Quarter, Year
4. Hover/tap day to see outfits worn
5. Insights: "You logged outfits 18 days this month"
6. Streak tracking visible on heatmap
7. Empty days highlighted for easy spotting
