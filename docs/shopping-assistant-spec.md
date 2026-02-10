# Shopping Assistant Feature Specification

**Epic:** 8 - "Check Before You Buy" Shopping Assistant  
**Priority:** #1 (Killer Feature)  
**Version:** 2.0  
**Status:** Planning Phase  
**Owner:** Development Team

---

## Overview

The Shopping Assistant helps users make smarter shopping decisions by analyzing products they're considering and showing instant compatibility with their existing wardrobe. This eliminates buyer's remorse and reduces fashion waste.

**Core Value:** "Will this item work with my wardrobe?" answered before purchase.

---

## User Stories

### Primary User Story
```
As a fashion shopper,
I want to check if a new item matches my existing wardrobe before buying it,
So that I can avoid wasteful purchases and buyer's remorse.
```

### Supporting User Stories

**Screenshot Input:**
```
As a user browsing Instagram/Pinterest,
I want to screenshot an outfit item I like,
So that I can quickly check compatibility without leaving the app.
```

**URL Input:**
```
As a user shopping on Zara/H&M website,
I want to paste the product URL,
So that the app can analyze the exact product details.
```

**Compatibility Insights:**
```
As a user unsure about a purchase,
I want to see which items in my wardrobe match the new item,
So that I can visualize complete outfits before buying.
```

**Wishlist Management:**
```
As an indecisive shopper,
I want to save potential purchases to a wishlist,
So that I can compare options over time.
```

---

## Feature Requirements

### 1. Input Methods

#### 1.1 Screenshot Upload ⭐ **PRIMARY METHOD**

**Flow:**
1. User taps "Check Before You Buy" button on home screen
2. Options appear: "Take Screenshot" or "Upload from Gallery"
3. User selects/uploads screenshot of product
4. App analyzes image

**Requirements:**
- Support JPEG, PNG, HEIC formats
- Max file size: 10MB
- Image dimensions: 500x500 to 4000x4000 pixels
- Auto-crop if needed

**Edge Cases:**
- Multiple items in screenshot → Detect all, ask user which to analyze
- Low quality image → Show warning "Image unclear, results may be inaccurate"
- No product detected → Suggest URL input instead

#### 1.2 URL Input

**Flow:**
1. User taps "Check Before You Buy"
2. Selects "Paste URL"
3. Pastes product link (e.g., `https://www.zara.com/us/en/product-12345`)
4. App scrapes product page

**Requirements:**
- Support major fashion sites: Zara, H&M, ASOS, Mango, COS, Uniqlo, Everlane
- Extract: product image, name, color, brand, price (optional)
- Fallback: If scraping fails, ask for screenshot

**URL Formats Supported:**
- `zara.com/*/product-*`
- `hm.com/*/productpage.*`
- `asos.com/*/prd/*`
- `shop.mango.com/*`
- Generic: Any URL with Open Graph meta tags

**Edge Cases:**
- Invalid URL → Show error "We couldn't load this page. Try a screenshot instead."
- Paywall/login required → Fallback to screenshot
- Product out of stock → Still analyze, add note "This item is out of stock"

---

### 2. AI Product Extraction

#### 2.1 Image Analysis (Gemini 1.5 Pro)

**Input:** Screenshot or scraped product image

**Gemini Prompt:**
```
Analyze this fashion product image and extract the following details in JSON format:

{
  "product_name": "Item name (e.g., 'Black Leather Jacket')",
  "category": "jacket|top|bottom|dress|shoes|accessories",
  "color": "Primary color (e.g., 'black', 'navy blue')",
  "secondary_colors": ["List", "of", "accent", "colors"],
  "style": "casual|formal|business|sporty|bohemian|minimalist",
  "material": "cotton|leather|denim|wool|synthetic|unknown",
  "pattern": "solid|striped|floral|plaid|geometric|none",
  "season": "spring|summer|fall|winter|all-season",
  "formality": 1-10 (1=very casual, 10=very formal),
  "versatility_score": 1-10 (1=statement piece, 10=basic staple)
}

If multiple items detected, return array of objects.
```

**Output:** Structured product data

#### 2.2 URL Scraping

**Tech Stack:**
- **Puppeteer** (headless browser) or **Cheerio** (HTML parser)
- **Open Graph** meta tags (`og:image`, `og:title`, `og:price`)
- **Schema.org Product** markup

**Extraction Logic:**
1. Load product page URL
2. Extract Open Graph tags first (fastest)
3. Fallback to schema.org `Product` JSON-LD
4. Fallback to CSS selectors (site-specific)
5. If all fail, ask user for screenshot

**Example (Zara):**
```javascript
{
  url: 'https://www.zara.com/us/en/oversized-blazer-p03046304.html',
  og:image: 'https://static.zara.net/photos/...jpg',
  og:title: 'OVERSIZED BLAZER - Navy blue | ZARA United States',
  og:price:amount: '89.90',
  product:brand: 'ZARA'
}
```

---

### 3. Compatibility Analysis

#### 3.1 Wardrobe Matching Algorithm

**Inputs:**
- Extracted product data
- User's complete wardrobe (all items with categories, colors, styles)

**Algorithm:**
```python
def calculate_compatibility(new_item, wardrobe):
    score = 0
    matching_items = []
    
    # Color Harmony (30 points)
    for item in wardrobe:
        if colors_harmonize(new_item.color, item.color):
            score += 5
            matching_items.append(item)
    
    # Style Consistency (25 points)
    style_matches = filter(lambda x: x.style == new_item.style, wardrobe)
    score += min(len(style_matches) * 2, 25)
    
    # Category Completion (20 points)
    if new_item fills wardrobe gap:
        score += 20
    
    # Versatility (15 points)
    score += new_item.versatility_score * 1.5
    
    # Formality Match (10 points)
    avg_formality = average([item.formality for item in wardrobe])
    score += 10 - abs(new_item.formality - avg_formality)
    
    return {
        'score': min(score, 100),
        'matching_items': matching_items[:5],  # Top 5
        'insights': generate_insights(new_item, wardrobe)
    }
```

**Color Harmony Rules:**
- Complementary colors: +10 points
- Analogous colors: +8 points
- Neutral with any: +7 points
- Clashing colors: -5 points

#### 3.2 Compatibility Score

**Score Ranges:**
- **90-100:** "Perfect Match! 🎯" (Green)
- **75-89:** "Great Choice! ✨" (Light Green)
- **60-74:** "Good Fit 👍" (Yellow)
- **40-59:** "Might Work ⚠️" (Orange)
- **0-39:** "Careful ❗" (Red)

**Display:**
```
┌─────────────────────────────────┐
│  Compatibility Score             │
│                                  │
│     ████████████░░ 85%          │
│     Great Choice! ✨             │
│                                  │
│  This navy blazer goes with:    │
│  • White Oxford Shirt            │
│  • Gray Dress Pants              │
│  • Black Leather Shoes           │
│  • Light Blue Jeans              │
│                                  │
└─────────────────────────────────┘
```

#### 3.3 AI-Generated Insights

**Insight Types:**

**1. Style Feedback:**
- Positive: "This green dress complements your warm-toned wardrobe beautifully"
- Cautionary: "This neon yellow might clash with your mostly neutral style"

**2. Gap Analysis:**
- "You don't have shoes that match this dress. Consider black heels."
- "This completes your workwear collection – you now have 5 professional outfits"

**3. Versatility Score:**
- "This white tee can be worn with 12 different items you own"
- "This statement jacket is bold but versatile – pairs with basics"

**4. Seasonal Relevance:**
- "Perfect for your spring wardrobe gap (0 light jackets)"
- "You have 8 winter coats already. Consider if you need another."

**5. Value Proposition:**
- "High versatility = great cost-per-wear potential"
- "This overlaps with your blue blazer. Do you need both?"

**Gemini Insight Prompt:**
```
Given this product analysis and wardrobe data, generate 3 personalized insights for the user:

Product: {product_json}
Wardrobe Summary: {wardrobe_stats}
Matching Items: {matching_items}

Provide:
1. Style feedback (does it fit their aesthetic?)
2. Wardrobe gap analysis (do they need this?)
3. Value insight (versatility, cost-per-wear potential)

Be honest, helpful, and concise. 2-3 sentences per insight.
```

---

### 4. Virtual Outfit Preview

#### 4.1 Outfit Mockup Generation

**Simple Approach (MVP):**
- Display new item image + matching wardrobe items side-by-side
- Grid layout: New item (large) + 3-4 matching items (smaller)

**Visual Example:**
```
┌────────────────────────────────────┐
│   NEW ITEM                         │
│   ┌───────────┐                    │
│   │           │                    │
│   │  Navy     │                    │
│   │  Blazer   │                    │
│   │           │                    │
│   └───────────┘                    │
│                                    │
│   PAIRS WELL WITH:                 │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│   │White│ │Gray│ │Black│ │Blue│   │
│   │Shirt│ │Pant│ │Shoe│ │Jean│    │
│   └────┘ └────┘ └────┘ └────┘    │
└────────────────────────────────────┘
```

**Advanced Approach (Phase 2):**
- AI-generated outfit flat lay
- Use generative AI to create cohesive outfit image
- Show 2-3 complete outfit suggestions

#### 4.2 Outfit Suggestions

**Logic:**
- Find top 5 matching items
- Create 2-3 complete outfits (top + bottom + shoes + optional accessory)
- Rank by formality and occasion

**Example:**
```
Outfit 1 (Business Casual)
• Navy Blazer (NEW)
• White Oxford Shirt
• Gray Dress Pants
• Black Leather Shoes

Outfit 2 (Smart Casual)
• Navy Blazer (NEW)
• White Tee
• Light Blue Jeans
• White Sneakers
```

---

### 5. Shopping Wishlist

#### 5.1 Save to Wishlist

**Flow:**
1. User reviews compatibility analysis
2. Taps "Save to Wishlist" button
3. Item added to "Shopping Wishlist" screen

**Data Stored:**
```sql
CREATE TABLE shopping_wishlists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  product_image_url TEXT,
  product_name TEXT,
  product_url TEXT,
  brand TEXT,
  price DECIMAL,
  compatibility_score INTEGER,
  matching_items JSONB,
  insights TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5.2 Wishlist Management

**Features:**
- View all saved items
- Sort by: compatibility score, price, date added
- Filter by: category, brand, price range
- Delete items
- Re-analyze (update compatibility as wardrobe changes)

**Notifications:**
- "3 items in your wishlist are on sale!"
- "Your wishlist item 'Navy Blazer' is back in stock"
- "You added 5 items this week. Ready to decide?"

---

### 6. Scan History

#### 6.1 Track All Scans

**Data Stored:**
```sql
CREATE TABLE shopping_scans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  input_type ENUM('screenshot', 'url'),
  product_image_url TEXT,
  product_data JSONB,
  compatibility_score INTEGER,
  user_rating INTEGER,  -- 1-5 stars for "Was this helpful?"
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 6.2 Scan History Screen

**Features:**
- View all past scans
- Filter by date, score, rating
- "Scan again" button (re-analyze with updated wardrobe)
- Insights: "You scanned 12 items this month, added 3 to wardrobe"

---

## User Interface Mockups

### Home Screen Integration

```
┌────────────────────────────────────┐
│  ☀️ Good morning, Yassine!         │
│                                    │
│  [Check Before You Buy] 🛍️        │
│   ↑ PRIMARY CTA                    │
│                                    │
│  Today's Outfit Suggestion:        │
│  [Outfit card...]                  │
│                                    │
│  OOTD Feed                         │
│  [Friend posts...]                 │
└────────────────────────────────────┘
```

### Shopping Assistant Flow

**Screen 1: Input Selection**
```
┌────────────────────────────────────┐
│  Check Before You Buy              │
│                                    │
│  How would you like to add it?     │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  📸 Screenshot or Photo      │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  🔗 Paste Product URL        │ │
│  └──────────────────────────────┘ │
│                                    │
│  Recent Scans ↓                    │
└────────────────────────────────────┘
```

**Screen 2: Analysis Loading**
```
┌────────────────────────────────────┐
│  Analyzing...                      │
│                                    │
│     [Animated spinner]             │
│                                    │
│  Finding matches in your wardrobe  │
│                                    │
│  (Usually takes 3-5 seconds)       │
└────────────────────────────────────┘
```

**Screen 3: Compatibility Results**
```
┌────────────────────────────────────┐
│ ← Navy Blazer from Zara       ⋮   │
│                                    │
│ ┌────────────────┐                 │
│ │                │                 │
│ │  [Product Img] │                 │
│ │                │                 │
│ └────────────────┘                 │
│                                    │
│ Compatibility Score                │
│  ████████████░░ 85%                │
│  Great Choice! ✨                  │
│                                    │
│ ✓ Goes with 8 items you own        │
│ ✓ Fills your workwear gap          │
│ ⚠️ You need black shoes for this   │
│                                    │
│ Pairs Well With:                   │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│ │    │ │    │ │    │ │    │       │
│ └────┘ └────┘ └────┘ └────┘      │
│ White  Gray   Black  Light         │
│ Shirt  Pants  Shoes  Jeans         │
│                                    │
│ [See Outfit Ideas] [Save to Wishlist]│
└────────────────────────────────────┘
```

---

## Technical Implementation

### Architecture

```
User Input (Screenshot/URL)
         ↓
    [React Native UI]
         ↓
    [Supabase Edge Function]
         ↓
   ┌─────┴─────┐
   │           │
[Gemini API]  [URL Scraper]
   │           │
   └─────┬─────┘
         ↓
  [Product Extraction]
         ↓
  [Compatibility Algorithm]
         ↓
  [Insert to shopping_scans table]
         ↓
  [Return results to UI]
```

### API Endpoints

#### POST `/shopping/analyze`

**Request:**
```json
{
  "user_id": "uuid",
  "input_type": "screenshot",  // or "url"
  "input_data": "base64_image" // or "product_url"
}
```

**Response:**
```json
{
  "scan_id": "uuid",
  "product": {
    "name": "Navy Blazer",
    "brand": "Zara",
    "category": "jacket",
    "color": "navy blue",
    "style": "business",
    "image_url": "https://..."
  },
  "compatibility": {
    "score": 85,
    "rating": "great_choice",
    "matching_items": [
      {
        "id": "uuid",
        "name": "White Oxford Shirt",
        "image_url": "https://...",
        "reason": "Classic pairing"
      },
      // ... more items
    ],
    "insights": [
      "This complements your warm-toned wardrobe",
      "Fills your workwear gap",
      "Consider black shoes to complete the look"
    ]
  },
  "outfit_suggestions": [
    {
      "occasion": "Business Casual",
      "items": ["uuid1", "uuid2", "uuid3"]
    }
  ]
}
```

### Database Schema

```sql
-- Shopping scans history
CREATE TABLE shopping_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  input_type TEXT CHECK (input_type IN ('screenshot', 'url')),
  input_data TEXT,  -- base64 image or URL
  product_data JSONB NOT NULL,
  compatibility_score INTEGER CHECK (compatibility_score BETWEEN 0 AND 100),
  matching_items JSONB,
  insights TEXT[],
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shopping_scans_user ON shopping_scans(user_id);
CREATE INDEX idx_shopping_scans_created ON shopping_scans(created_at DESC);

-- Shopping wishlist
CREATE TABLE shopping_wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES shopping_scans(id),
  product_name TEXT,
  product_url TEXT,
  product_image_url TEXT,
  brand TEXT,
  price DECIMAL,
  compatibility_score INTEGER,
  matching_items JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shopping_wishlists_user ON shopping_wishlists(user_id);
```

---

## Success Metrics

### Primary Metrics

- **Usage:** 30% of users scan at least 1 item within 30 days
- **Frequency:** Active users scan 2-3 items per week
- **Satisfaction:** Average rating ≥ 4.2/5 stars ("Was this helpful?")
- **Impact:** 30% of users report "avoided a regret purchase"

### Secondary Metrics

- **Wishlist Engagement:** 20K items saved to wishlists per month
- **Repeat Usage:** 60% of users who scan once, scan again within 7 days
- **High-Score Purchases:** Users are 2x more likely to buy items with ≥80% compatibility
- **Wardrobe Growth:** Users add 15% more items to wardrobe after using Shopping Assistant

### Analytics to Track

- Distribution of compatibility scores (histogram)
- Most common input type (screenshot vs URL)
- Average scan-to-wishlist conversion rate
- Most scanned brands/product categories
- Peak scanning times (day of week, hour)

---

## Future Enhancements (V3)

### Monetization
- Add affiliate "Buy Now" buttons
- Freemium: 3 scans/week free, unlimited for $4.99/month
- Price tracking: Alert when wishlist items go on sale

### Advanced Features
- Multi-site price comparison
- Size recommendation based on body measurements
- Social: "Ask friends" – share scan with Style Squad for opinions
- AI stylist chat: "Help me decide between these 3 jackets"

### Integration
- Browser extension: Scan directly on shopping sites
- Instagram integration: Scan outfits in posts
- Calendar tie-in: "Scan outfit for your Tuesday meeting"

---

**Document Status:** Final  
**Next Steps:** Create detailed user stories and acceptance criteria for V2 PRD  
**Owner:** Product Team (Mary, Business Analyst)
