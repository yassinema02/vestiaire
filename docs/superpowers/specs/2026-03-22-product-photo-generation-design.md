# Product Photo Generation — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Approach:** Prompt-Only Swap (Approach A)

## Problem

When users upload wardrobe item photos, they come from varied angles, lighting conditions, and backgrounds (selfies, messy rooms, different cameras). The wardrobe grid looks inconsistent and unprofessional. Users deserve the same visual harmony they see when browsing clothing on Zara or COS.

## Solution

Add an AI product photo generation step to the item confirmation flow. The AI regenerates the uploaded item as a professional e-commerce product photo — ghost mannequin style, consistent lighting, consistent background, consistent angle. This replaces background removal in the bulk upload pipeline and adds new image enhancement to the single-item flow.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Original photo | Stored as backup (`original_image_url`) | Safety net if AI misinterprets the garment |
| Photo style | Ghost mannequin, light gray `#F5F5F5` bg | Most "Zara-like" premium feel, works across all categories |
| Categorization input | Original photo | Richer context (setting, how it's worn) for accurate labeling |
| Entry points | Single item + bulk upload | Shopping scans are already product photos from retail sites |
| Processing UX | Optimistic — form shown immediately, image swaps in when ready | User is never idle waiting for generation |
| Implementation | Prompt-only swap — same model, same API call pattern | Same cost as current bg removal, minimal code change |
| Failures | Silent — original photo kept, no error shown | No friction added to the flow |
| New migrations | None | Existing `image_url` + `original_image_url` columns suffice |
| Metadata edits | Generation uses AI categorization values only, not user edits | Avoids race condition; user edits happen on the form while generation runs in parallel with the initial AI values |

## Architecture

### Current Flows

**Single item (confirm-item.tsx):** Currently has no background removal. The flow is:
```
User Photo → AI Categorize (blocking) → Show Form (original photo) → Save Item
```
The original photo is displayed as-is on the confirm screen and saved directly.

**Bulk upload (bulk-upload.tsx):** Has background removal via `batchBgRemovalService`:
```
Detect Items → BG Removal (per item) → Review → Save Items
```

### New Flows

**Single item (confirm-item.tsx) — NEW: adds product photo generation:**
```
User Photo → AI Categorize ─┬→ Show Form (original photo) ← user edits metadata
                             └→ Product Photo Gen (background) ← uses AI metadata
                                        ↓
                                   Swap Image In → Save (product + original)
```

**Bulk upload — replaces BG removal with product photo generation:**
```
Detect Items → Product Photo Gen (per item, sequential) → Review → Save Items
```

Key improvement for single item: after categorization completes, the confirm form shows immediately with the original photo. The user edits metadata while the product photo generates in the background. When ready, the image crossfades to the product version.

## Prompt Design

```
Generate a professional e-commerce product photo of this clothing item.

ITEM DETAILS:
- Category: {category} / {subCategory}
- Colors: {colors}
- Pattern: {pattern}

STYLE REQUIREMENTS:
- Ghost mannequin presentation: the item should appear with natural 3D form
  as if worn by an invisible person, showing its shape and drape
- Clean, light gray (#F5F5F5) background
- Soft, even studio lighting from above-left
- Subtle drop shadow beneath the item for depth
- Front-facing, slightly angled view
- No model, no hanger, no props, no text, no watermarks

CRITICAL RULES:
- Preserve the EXACT colors, pattern, texture, and details of the original item
- Do NOT change the design, add logos, or modify any features of the clothing
- The output must look like it belongs on Zara.com or COS.com
- Maintain the correct proportions and silhouette of the item
```

The categorization metadata (category, colors, pattern) is injected from the AI categorization step to ground the model and prevent hallucinations (e.g., changing colors).

**Note on category-specific rendering:** The ghost mannequin style works naturally for tops, dresses, bottoms, and outerwear. For shoes and accessories, the model will interpret the instruction as best it can (typically a clean product shot on the gray background). If results for shoes/accessories are poor in testing, we can add category-specific prompt variants in a follow-up — but ghost mannequin as the universal default is acceptable for V1.

## UX Flow — confirm-item.tsx

### Timeline

1. **User arrives** — Original photo shown at top. AI categorization populates form fields.
2. **Generation starts** — Subtle shimmer overlay on image. Small "Enhancing photo..." label at bottom of the image area. User can freely edit metadata.
3. **Generation complete** — Image crossfades (300ms) from original to product photo. "Enhanced ✓" badge appears at top-right of image for 2 seconds, then fades out.
4. **User taps "Looks Good"** — Product photo saved as `image_url`. Original saved as `original_image_url`.

### Image Area States

- **Loading**: Original photo visible with shimmer overlay + "Enhancing..." label at bottom
- **Success**: Product photo on gray background + "Enhanced ✓" badge (top-right, 2s timed fadeout)
- **Failed**: Original photo kept silently. No error shown to user.

### Metadata Edit Behavior

Product photo generation uses the **AI categorization values** (not user edits) as prompt metadata. Rationale: generation kicks off immediately after categorization completes, in parallel with the user editing the form. The user's edits affect only the saved item metadata, not the generated image. This avoids the complexity of re-triggering generation on every field change.

### Edge Cases

- **User taps "Looks Good" before generation finishes**: Save with original photo as `image_url`. Discard the in-flight generation (result is ignored when it completes). The user gets their item saved immediately with the original photo — no background continuation or async update.
- **Generation fails (timeout/API error)**: Original photo becomes `image_url`. No error toast — the user never knew it was happening.
- **User navigates away mid-generation**: Result is discarded. Note: we do not add AbortController to the API call chain in V1 — the HTTP request completes but we ignore the response. The cost of one wasted call is negligible vs the complexity of threading AbortSignal through the tracked API wrapper.
- **Bulk upload**: Product photo generation replaces BG removal in the batch pipeline. Processed sequentially per item to avoid rate limits. Progress indicator shown per item.

## Files Changed

### Modified

| File | Change |
|------|--------|
| `constants/prompts.ts` | Replace `BACKGROUND_REMOVAL_PROMPT` with `PRODUCT_PHOTO_PROMPT` |
| `services/backgroundRemoval.ts` | Rename to `productPhotoService.ts`. Add metadata parameter (`{ category, subCategory, colors, pattern }`) to generation function. Update feature tag from `'bg_removal'` to `'product_photo'`. |
| `services/aiUsageLogger.ts` | Add `'product_photo'` to `AIFeature` union type. Remove `'bg_removal'`. |
| `app/(tabs)/confirm-item.tsx` | Add product photo generation after categorization completes. Show original photo immediately. Add shimmer overlay, crossfade animation (300ms), and "Enhanced ✓" badge (2s). Handle early submission (save original, discard in-flight generation). |
| `services/storage.ts` | Reuse existing `uploadProcessedImage` function with updated path pattern: `{userId}/{timestamp}_product.png`. |
| `app/(tabs)/bulk-upload.tsx` | Replace BG removal phase references with product photo generation. Update phase labels and progress copy. |
| `services/bulkUploadService.ts` | Replace `batchBgRemovalService` calls with `productPhotoService` calls. Same sequential processing pattern. |
| `stores/extractionStore.ts` | Rename BG removal state fields: `isBgRemoving` → `isGeneratingPhotos`, `bgRemovalProgress` → `photoGenProgress`, `bg_removal_status` → `photo_gen_status`. Update `ExtractionPhase` type. |
| `types/extraction.ts` | Update `ProcessedDetectedItem.bg_removal_status` → `photo_gen_status`. Update `ExtractionPhase` enum/union. |
| `utils/extractionMessages.ts` | Update phase-specific copy for the product photo generation phase. |

### Unchanged

| File | Why |
|------|-----|
| `services/aiCategorization.ts` | No changes — still runs on original photo |
| `supabase/functions/ai-proxy/index.ts` | No changes — same model (`gemini-2.5-flash-image`), same call pattern |
| `app/(tabs)/shopping.tsx` | Excluded — shopping scans are already product photos |

## Data Model

### Items Table (no migration needed)

- `image_url` — Product photo (what's displayed in wardrobe grid)
- `original_image_url` — User's original upload (backup)

Both columns already exist. Currently they store the same URL. After this change, `image_url` stores the generated product photo and `original_image_url` stores the original.

### Storage Bucket (`wardrobe-images`, public)

- Original: `{userId}/{timestamp}.jpg` (same as today)
- Product photo: `{userId}/{timestamp}_product.png` (new file, same bucket, via existing `uploadProcessedImage`)

### AI Usage Logging

- New feature tag: `'product_photo'` replaces `'bg_removal'` in `AIFeature` type
- Same model: `gemini-2.5-flash-image`
- Same cost profile as background removal

## Cost Impact

**None.** The product photo generation replaces background removal 1:1 in bulk upload, and adds one new call per item in the single-item flow (which previously had no image processing). For single items, this is a new cost — roughly equal to one background removal call (~$0.002-0.005 per item depending on image size). For bulk upload, cost is unchanged.

## V1 Scope Boundaries

Explicitly **not** in V1:
- No category-specific prompt variants (universal ghost mannequin for all categories)
- No AbortController for cancelling in-flight API requests
- No user-facing toggle to switch between original and product photo
- No re-generation trigger on metadata edits
- No quality validation gate (second AI call to verify output)

These can be added incrementally if needed based on real usage feedback.
