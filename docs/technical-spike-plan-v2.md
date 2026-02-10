# V2 Technical Spike Plan

**Purpose:** Validate risky technical assumptions before full V2 implementation  
**Duration:** 2 weeks (concurrent with database setup)  
**Date:** February 9, 2026

---

## Overview

V2 introduces **3 high-risk technical components** that must be validated before committing to full development:

1. **URL Product Scraper** - Can we reliably extract product data from fashion websites?
2. **Gemini Photo Extraction** - Can AI accurately detect clothing items in photos?
3. **Performance at Scale** - Can existing infrastructure handle new features?

---

## Spike 1: URL Product Scraper Validation

### Goal
Determine feasibility and accuracy of scraping product data from major fashion retailer websites.

### Success Criteria
- ✅ Successfully scrape **8/10 target websites** with ≥90% accuracy
- ✅ Average scrape time < 8 seconds per URL
- ✅ Identify reliable data sources (Open Graph, schema.org, custom selectors)

### Target Websites (Top 10)

| Rank | Website | Priority | Expected Difficulty |
|------|---------|----------|---------------------|
| 1 | Zara | High | Medium (React SPA) |
| 2 | H&M | High | Low (Good meta tags) |
| 3 | ASOS | High | Medium (Heavy JS) |
| 4 | Mango | High | Medium |
| 5 | Uniqlo | Medium | Low |
| 6 | Everlane | Medium | Low |
| 7 | COS | Medium | Medium |
| 8 | & Other Stories | Medium | Medium |
| 9 | Massimo Dutti | Low | Medium |
| 10 | Arket | Low | Medium |

### Test Cases (Per Website)

For each site, test these product URLs:

1. **Simple product:** Basic t-shirt (single color, simple description)
2. **Complex product:** Patterned dress (multiple colors, detailed fabric)
3. **Sale item:** Discounted item (test price extraction)
4. **Out of stock:** Unavailable product (handle gracefully)

**Total test cases:** 10 sites × 4 products = **40 scrapes**

### Data Points to Extract

**Required (must have):**
- ✅ Product name
- ✅ Product image URL (high-res)
- ✅ Brand name
- ✅ Color

**Optional (nice to have):**
- Price (amount + currency)
- Material/fabric
- Product description
- Category

### Implementation Approach

**Week 1: Research & Prototype**

**Day 1-2:** Research scraping strategies
```bash
# Tools to evaluate:
- Cheerio (HTML parsing)
- Puppeteer (headless browser, for heavy JS sites)
- Open Graph Protocol (meta tags)
- schema.org markup (JSON-LD)
```

**Day 3-4:** Build prototype scraper
```typescript
// Supabase Edge Function: scrape-product.ts

interface ScrapedProduct {
  name: string;
  brand: string;
  color: string;
  imageUrl: string;
  price?: { amount: number; currency: string };
  material?: string;
  description?: string;
}

async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  // 1. Try Open Graph meta tags (fastest)
  // 2. Try schema.org JSON-LD
  // 3. Fallback to site-specific selectors
  // 4. If all fail, return error
}
```

**Day 5:** Run 40 test scrapes, document results

**Deliverable:** Scraping accuracy report with success rates per site

---

### Expected Challenges

| Challenge | Mitigation Strategy |
|-----------|---------------------|
| **Bot detection** | Use realistic user agents, delay requests |
| **Dynamic content (SPA)** | Use Puppeteer for JS-heavy sites |
| **Rate limiting** | Implement request queue, respect robots.txt |
| **Inconsistent markup** | Build site-specific selectors as fallback |
| **CORS issues** | Run scraper server-side (Edge Function) |

---

### Decision Matrix

**If scraping success rate ≥ 80%:**
→ **Proceed** with URL scraping feature

**If scraping success rate 50-79%:**
→ **Proceed**, but set user expectations (show "Screenshot method recommended" warnings)

**If scraping success rate < 50%:**
→ **Pivot** to screenshot-only method, defer URL scraping to V3

---

## Spike 2: Gemini Photo Extraction Accuracy

### Goal
Validate that Gemini 1.5 Pro can accurately detect and categorize clothing items from user photos.

### Success Criteria
- ✅ **≥85% accuracy** for category detection
- ✅ **≥75% accuracy** for color detection
- ✅ **≥3 items per photo** successfully detected (multi-item photos)
- ✅ Average processing time < 10 seconds per photo

### Test Dataset

**Collect 50 test photos:**

| Photo Type | Count | Description |
|------------|-------|-------------|
| **Mirror selfies** | 15 | Full body, single outfit (standard OOTD) |
| **Professional photos** | 10 | Clean background, single item (product-like) |
| **Multi-item** | 15 | Wardrobe flatlays (3-5 items visible) |
| **Challenging** | 10 | Busy backgrounds, poor lighting, partial body |

**Sourcing:** Instagram (public OOTD posts), Pinterest (fashion boards), team member photos

### Evaluation Metrics

For each photo, manually label:
1. Number of items visible
2. Category for each item (ground truth)
3. Primary color for each item (ground truth)

**Accuracy calculation:**
```
Category Accuracy = (Correct categories / Total items) × 100
Color Accuracy = (Correct colors / Total items) × 100
Detection Rate = (Items detected / Items visible) × 100
```

### Gemini Prompt Template

```typescript
const prompt = `
You are a fashion AI assistant. Analyze this photo and detect all visible clothing items.

For each item, provide:
- category: one of [tops, bottoms, dresses, outerwear, shoes, accessories]
- name: descriptive name (e.g., "Black leather jacket")
- color: primary color
- secondary_colors: array of additional colors (if any)
- style: one of [casual, formal, sporty, streetwear, bohemian]
- material: best guess (cotton, denim, leather, etc.)
- confidence: 0-100 score

Return JSON array:
[
  {
    "category": "tops",
    "name": "White cotton t-shirt",
    "color": "white",
    "secondary_colors": [],
    "style": "casual",
    "material": "cotton",
    "confidence": 95
  },
  ...
]

Only detect items clearly visible. Ignore background or unclear items.
`;
```

### Implementation

**Week 1: Setup & Testing**

**Day 1:** Set up Gemini API access, test basic image analysis
**Day 2-3:** Test on 50 photos, record results
**Day 4:** Analyze results, identify failure patterns
**Day 5:** Refine prompt, re-test on failed cases

### Expected Challenges

| Challenge | Mitigation Strategy |
|-----------|---------------------|
| **Low confidence on similar items** | Set confidence threshold (≥70% to auto-accept) |
| **Color naming inconsistency** | Standardize color palette (20 canonical colors) |
| **Background noise** | Improve prompt: "Ignore background, focus on worn/displayed items" |
| **Multi-layer outfits** | Prompt: "Detect layered items separately (jacket + shirt)" |

---

### Decision Matrix

**If accuracy ≥ 85% (category) and ≥ 75% (color):**
→ **Proceed** with full AI Wardrobe Extraction feature

**If accuracy 70-84% (category):**
→ **Proceed**, but add manual review step (user confirms/edits each item)

**If accuracy < 70%:**
→ **Defer** to V3, keep manual photo upload only

---

## Spike 3: Performance & Infrastructure Validation

### Goal
Ensure existing Supabase Edge Functions and infrastructure can handle V2's increased load.

### Success Criteria
- ✅ Shopping Assistant scan: **< 5 seconds** end-to-end
- ✅ OOTD feed load: **< 2 seconds** for 20 posts
- ✅ Photo extraction batch (20 photos): **< 2 minutes**
- ✅ No API quota exceeded during stress test

### Performance Tests

#### Test 1: Shopping Assistant Latency

**Scenario:** User scans product screenshot

**Steps:**
1. Upload image (500KB) to Supabase Storage
2. Call Gemini to extract product details
3. Calculate compatibility score (query wardrobe)
4. Return results to frontend

**Target:** < 5 seconds total

**Bottleneck risks:**
- Gemini API latency (2-3s expected)
- Wardrobe query with 200+ items (1s expected)
- Image upload to storage (0.5s expected)

**Test plan:**
- Simulate 10 concurrent scans
- Measure P50, P95, P99 latency
- Identify slowest step

---

#### Test 2: OOTD Feed Query Performance

**Scenario:** User opens Social tab, loads feed

**Query complexity:**
```sql
SELECT 
  p.*,
  u.username,
  u.avatar_url,
  s.name as squad_name
FROM ootd_posts p
JOIN users u ON u.id = p.user_id
JOIN style_squads s ON s.id = p.squad_id
WHERE p.squad_id IN (
  SELECT squad_id FROM squad_memberships WHERE user_id = ?
)
ORDER BY p.created_at DESC
LIMIT 20;
```

**Target:** < 500ms query time

**Test with:**
- User in 5 squads
- 100 total posts across squads
- Measure query time with EXPLAIN ANALYZE

---

#### Test 3: Batch Photo Extraction

**Scenario:** User uploads 20 photos for wardrobe extraction

**Steps:**
1. Upload 20 photos to storage (parallel)
2. Queue 20 Gemini API calls (rate-limited to 5 concurrent)
3. Process results (background removal, storage)
4. Return detected items

**Target:** < 2 minutes total

**Bottleneck risks:**
- Gemini rate limits (10 requests/minute on free tier)
- Background removal API (Remove.bg: 50 images/month free tier)

**Test plan:**
- Use Gemini Pro tier (check rate limits)
- Evaluate Remove.bg alternatives (self-hosted RMBG-1.4 model?)

---

### API Quota Review

| Service | Current Usage (V1) | V2 Projected | Free Tier Limit | Cost After Limit |
|---------|-------------------|--------------|-----------------|------------------|
| **Gemini Pro** | ~1K calls/month | ~15K calls/month | 60 calls/min | $0.00025/call |
| **Remove.bg** | 0 | ~500 calls/month | 50/month | $0.20/image |
| **Supabase DB** | 100MB | 1GB | 500MB free | $0.125/GB |
| **Supabase Storage** | 500MB | 5GB | 1GB free | $0.021/GB |
| **OpenWeather** | ~2K calls/month | ~2K calls/month | 1K calls/day | Free tier fine |

**Critical:** Remove.bg cost will be **$90+/month** at scale → **Must find alternative**

**Recommendation:** Self-host background removal using RMBG-1.4 model
- Deploy as Supabase Edge Function with GPU
- OR use AWS Lambda with GPU (PyTorch)

---

### Infrastructure Decisions

**Question 1:** Edge Functions vs Dedicated Backend?

**Current:** All APIs in Supabase Edge Functions (Deno runtime)

**V2 needs:**
- Heavy AI processing (Gemini calls)
- Background removal (image processing)
- Batched async jobs

**Decision criteria:**
- If Edge Functions handle load well → **Keep current architecture**
- If latency issues → **Add dedicated FastAPI backend** for AI tasks

**Spike test:** Run 50 concurrent Shopping Assistant scans, measure Edge Function cold start + execution time

---

**Question 2:** Background Removal Strategy?

**Options:**

| Option | Pros | Cons | Cost (500 images/month) |
|--------|------|------|------------------------|
| **Remove.bg API** | Easy integration, high quality | Expensive at scale | **$100/month** |
| **Self-hosted RMBG-1.4** | Free after setup, unlimited | Requires GPU, maintenance | **$20/month** (AWS Lambda GPU) |
| **Skip background removal** | Zero cost, fast | Lower wardrobe aesthetic | **$0** |

**Spike test:** Implement RMBG-1.4 on AWS Lambda, test quality vs Remove.bg

---

## Spike Execution Timeline

### Week 1: Foundation

**Monday:**
- ✅ Set up scraper test environment
- ✅ Set up Gemini API access
- ✅ Collect 50 test photos

**Tuesday-Wednesday:**
- ✅ Run 40 URL scraping tests
- ✅ Run 50 photo extraction tests

**Thursday:**
- ✅ Analyze scraping results
- ✅ Analyze photo extraction accuracy

**Friday:**
- ✅ Performance tests (Shopping Assistant, OOTD feed)
- ✅ Document findings

---

### Week 2: Refinement & Decision

**Monday:**
- ✅ Refine Gemini prompts based on Week 1 failures
- ✅ Build RMBG-1.4 prototype

**Tuesday:**
- ✅ Re-test improved prompts (20 failed photos)
- ✅ Test RMBG-1.4 vs Remove.bg quality

**Wednesday:**
- ✅ Stress test Edge Functions (100 concurrent requests)
- ✅ Test batch photo processing (50 photos)

**Thursday:**
- ✅ Consolidate all results
- ✅ Write spike report

**Friday:**
- ✅ **GO/NO-GO DECISION MEETING**
- ✅ Update PRD if pivots needed
- ✅ Finalize V2 implementation plan

---

## Deliverables

### 1. URL Scraper Report
- Success rate per website (table)
- Average scrape time (chart)
- Recommended implementation approach
- Edge cases to handle

### 2. Photo Extraction Report
- Accuracy metrics (category, color, detection rate)
- Example successes and failures (screenshots)
- Recommended Gemini prompt template
- Confidence threshold recommendation

### 3. Performance Report
- Latency benchmarks (P50/P95/P99)
- API quota projections
- Infrastructure recommendations
- Cost estimates at 10K, 50K, 100K users

### 4. Go/No-Go Decision Document
**For each feature:**
- ✅ **GO** - Validated, proceed as planned
- ⚠️ **GO with caveats** - Proceed with reduced scope
- ❌ **NO-GO** - Defer to V3, pivot to alternative

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scraping blocked by bot detection** | Medium | High | Use Puppeteer, rotate user agents |
| **Gemini accuracy too low** | Low | High | Add manual review step |
| **Edge Functions too slow** | Low | Medium | Move to dedicated backend |
| **Remove.bg too expensive** | High | Medium | Self-host RMBG-1.4 |
| **API rate limits exceeded** | Medium | High | Implement queue, upgrade Gemini tier |

---

## Success Metrics

**Spike is successful if:**
1. ✅ **≥2 of 3 spikes** pass success criteria
2. ✅ Cost projections stay within budget ($5K/month at 50K users)
3. ✅ No critical blockers identified
4. ✅ Team confident in V2 technical approach

**If spikes fail:**
- Revise V2 scope (remove failing features)
- Update timeline (add 2-4 weeks for alternative approach)
- Re-evaluate budget

---

**Document Status:** Ready to Execute  
**Owner:** Tech Lead  
**Start Date:** February 10, 2026  
**Decision Date:** February 21, 2026  
**Last Updated:** February 9, 2026
