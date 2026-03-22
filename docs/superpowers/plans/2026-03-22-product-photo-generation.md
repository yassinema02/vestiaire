# Product Photo Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace background removal with AI product photo generation so every wardrobe item looks like a professional e-commerce product shot (ghost mannequin style, consistent lighting and background).

**Architecture:** Prompt-only swap — same `gemini-2.5-flash-image` model, same API call pattern through `ai-proxy`. The service is renamed from `backgroundRemoval` to `productPhotoService`, the prompt changes from "remove background" to "generate product photo", and categorization metadata is passed to ground the prompt. In the single-item flow (`add.tsx` → `confirm-item.tsx`), product photo generates in the background on the confirm screen while the user edits metadata.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Gemini 2.5 Flash Image via Supabase Edge Function (`ai-proxy`), Supabase Storage, Zustand stores.

**Spec:** `docs/superpowers/specs/2026-03-22-product-photo-generation-design.md`

---

## Important Context

The current single-item flow is:
1. `add.tsx`: user picks photo → uploads to storage → creates item record → runs **blocking** BG removal → uploads processed image → navigates to confirm-item with the processed (or original) URL
2. `confirm-item.tsx`: runs AI categorization → shows form → user edits → saves

The new flow removes BG removal from `add.tsx` entirely. Instead:
1. `add.tsx`: user picks photo → uploads to storage → creates item record → navigates to confirm-item with the **original** URL (no processing)
2. `confirm-item.tsx`: runs AI categorization → shows form with original photo → kicks off product photo generation in background using categorization metadata → swaps image when ready

This makes `add.tsx` faster (no blocking BG removal wait) and moves all AI image processing to the confirm screen where it runs in parallel with user interaction.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/mobile/constants/prompts.ts` | Modify | Replace `BACKGROUND_REMOVAL_PROMPT` with `PRODUCT_PHOTO_PROMPT` |
| `apps/mobile/services/productPhotoService.ts` | Create (replaces `backgroundRemoval.ts`) | Generate product photos via Gemini with metadata-enriched prompt |
| `apps/mobile/services/aiUsageLogger.ts` | Modify | Replace `'bg_removal'` with `'product_photo'` in `AIFeature` type |
| `apps/mobile/services/storage.ts` | Modify | Update `uploadProcessedImage` path to `_product.png` |
| `apps/mobile/app/(tabs)/add.tsx` | Modify | Remove BG removal block (lines 134-169), pass original URL to confirm-item |
| `apps/mobile/app/(tabs)/confirm-item.tsx` | Modify | Add background product photo generation with shimmer + crossfade UX |
| `apps/mobile/services/batchProductPhotoService.ts` | Create (replaces `batchBgRemovalService.ts`) | Batch product photo generation for bulk upload |
| `apps/mobile/stores/extractionStore.ts` | Modify | Rename all BG removal state/actions to product photo gen equivalents |
| `apps/mobile/types/extraction.ts` | Modify | Rename `bg_removal_status` → `photo_gen_status`, `BgRemovalProgress` → `PhotoGenProgress` |
| `apps/mobile/utils/extractionMessages.ts` | Modify | Update phase name `bgRemoval` → `photoGen`, update copy and time estimates |
| `apps/mobile/app/(tabs)/bulk-upload.tsx` | Modify | Update imports, variable names, UI copy from BG removal to product photo gen |
| `apps/mobile/app/(tabs)/review-items.tsx` | Modify | Update `bg_removal_status` → `photo_gen_status` reference |
| `apps/mobile/__tests__/services/batchBgRemovalService.test.ts` | Delete or rename | Old test file for deleted service |
| `apps/mobile/__tests__/stores/extractionStore.background.test.ts` | Modify | Update mocks and references from BG removal to product photo gen |
| `apps/mobile/__tests__/stores/extractionStore.review.test.ts` | Modify | Update `bg_removal_status` references to `photo_gen_status` |

---

### Task 1: Create the Product Photo Prompt

**Files:**
- Modify: `apps/mobile/constants/prompts.ts:28-30`

- [ ] **Step 1: Replace the background removal prompt with the product photo prompt**

In `apps/mobile/constants/prompts.ts`, replace the comment on line 28 and the constant on line 30:

```typescript
// Old (lines 28-30):
// ─── backgroundRemoval.ts ────────────────────────────────────────
export const BACKGROUND_REMOVAL_PROMPT = 'Remove the background from this clothing item photo. Keep only the clothing item itself on a clean pure white background. Preserve all details of the clothing. Do not add any text or watermarks.';

// New:
// ─── productPhotoService.ts ──────────────────────────────────────
export const PRODUCT_PHOTO_PROMPT = `Generate a professional e-commerce product photo of this clothing item.

ITEM DETAILS:
{ITEM_DETAILS}

STYLE REQUIREMENTS:
- Ghost mannequin presentation: the item should appear with natural 3D form as if worn by an invisible person, showing its shape and drape
- Clean, light gray (#F5F5F5) background
- Soft, even studio lighting from above-left
- Subtle drop shadow beneath the item for depth
- Front-facing, slightly angled view
- No model, no hanger, no props, no text, no watermarks

CRITICAL RULES:
- Preserve the EXACT colors, pattern, texture, and details of the original item
- Do NOT change the design, add logos, or modify any features of the clothing
- The output must look like it belongs on Zara.com or COS.com
- Maintain the correct proportions and silhouette of the item`;
```

The `{ITEM_DETAILS}` placeholder will be replaced at runtime by the service with actual categorization metadata.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/constants/prompts.ts
git commit -m "feat: replace background removal prompt with product photo generation prompt"
```

---

### Task 2: Create the Product Photo Service

**Files:**
- Create: `apps/mobile/services/productPhotoService.ts` (replaces `backgroundRemoval.ts`)
- Modify: `apps/mobile/services/aiUsageLogger.ts:14` (AIFeature type)

- [ ] **Step 1: Update the AIFeature type**

In `apps/mobile/services/aiUsageLogger.ts`, find the `AIFeature` type union (line ~14) and replace `'bg_removal'` with `'product_photo'`:

```typescript
// Old:
  | 'bg_removal'
// New:
  | 'product_photo'
```

- [ ] **Step 2: Create `productPhotoService.ts`**

Create `apps/mobile/services/productPhotoService.ts`:

```typescript
/**
 * Product Photo Generation Service
 * Uses Gemini 2.5 Flash Image to generate professional e-commerce product photos
 */

import { PRODUCT_PHOTO_PROMPT } from '../constants/prompts';
import { trackedGenerateContent, isGeminiConfigured } from './aiUsageLogger';
import { optimizeForAI } from './imageOptimizer';

export interface ProductPhotoResult {
    processedImageBase64: string | null;
    error: Error | null;
}

export interface ProductPhotoMetadata {
    category?: string;
    subCategory?: string;
    colors?: string[];
    pattern?: string;
}

export const isProductPhotoConfigured = (): boolean => {
    return isGeminiConfigured();
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

function buildPrompt(metadata?: ProductPhotoMetadata): string {
    const details: string[] = [];
    if (metadata?.category) {
        details.push(`- Category: ${metadata.category}${metadata.subCategory ? ` / ${metadata.subCategory}` : ''}`);
    }
    if (metadata?.colors?.length) {
        details.push(`- Colors: ${metadata.colors.join(', ')}`);
    }
    if (metadata?.pattern) {
        details.push(`- Pattern: ${metadata.pattern}`);
    }

    const itemDetails = details.length > 0
        ? details.join('\n')
        : '- (No metadata available — analyze the item from the image)';

    return PRODUCT_PHOTO_PROMPT.replace('{ITEM_DETAILS}', itemDetails);
}

/**
 * Generate a professional e-commerce product photo from a clothing item image
 * @param imageUrl - URL or local URI of the image to process
 * @param metadata - Optional categorization metadata to ground the prompt
 * @returns Processed image as base64 or error
 */
export const generateProductPhoto = async (
    imageUrl: string,
    metadata?: ProductPhotoMetadata
): Promise<ProductPhotoResult> => {
    if (!isProductPhotoConfigured()) {
        console.warn('Product photo generation not configured — missing AI proxy configuration');
        return { processedImageBase64: null, error: new Error('Product photo generation not configured') };
    }

    try {
        console.log('Starting product photo generation with Gemini');

        const optimizedUri = await optimizeForAI(imageUrl);
        const imageResponse = await fetch(optimizedUri);
        const imageBlob = await imageResponse.blob();
        const imageBase64 = await blobToBase64(imageBlob);

        const prompt = buildPrompt(metadata);

        const response = await trackedGenerateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: imageBase64,
                            },
                        },
                    ],
                },
            ],
        }, 'product_photo');

        const parts = (response.candidates?.[0] as any)?.content?.parts as Array<any> | undefined;
        if (!parts) {
            throw new Error('No response parts from Gemini');
        }

        const imagePart = parts.find((part: any) => part.inlineData);
        if (!imagePart?.inlineData?.data) {
            throw new Error('No image data in Gemini response');
        }

        const base64 = imagePart.inlineData.data;
        console.log('Product photo generation successful, base64 length:', base64.length);

        return { processedImageBase64: base64, error: null };
    } catch (error) {
        console.error('Product photo generation failed:', error);
        return { processedImageBase64: null, error: error as Error };
    }
};
```

- [ ] **Step 3: Delete the old `backgroundRemoval.ts`**

```bash
rm apps/mobile/services/backgroundRemoval.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/services/productPhotoService.ts apps/mobile/services/aiUsageLogger.ts
git rm apps/mobile/services/backgroundRemoval.ts
git commit -m "feat: create productPhotoService replacing backgroundRemoval

Adds metadata-enriched prompt for ghost mannequin product photo generation.
Same model (gemini-2.5-flash-image), new feature tag 'product_photo'."
```

---

### Task 3: Remove BG Removal from add.tsx

**Files:**
- Modify: `apps/mobile/app/(tabs)/add.tsx:134-178`

This is critical — `add.tsx` currently does blocking BG removal before navigating to confirm-item. We remove that entirely so the user gets to the confirm screen faster, and product photo generation happens there instead.

- [ ] **Step 1: Read add.tsx fully**

Read `apps/mobile/app/(tabs)/add.tsx` to understand the full `handleUpload` function (lines ~106-186).

- [ ] **Step 2: Remove the BG removal block**

In the `handleUpload` function, remove lines 134-169 (the entire "Step 3: Attempt background removal" block including the dynamic import, the try/catch, and the `processedUrl` variable).

Also remove line 136 (`let processedUrl: string | null = null;`) and update the navigation at line 178:

```typescript
// Old (line 178):
const displayUrl = processedUrl || url;
// New — always pass the original URL:
const displayUrl = url;
```

Or even simpler, just inline `url` directly into the router.push params.

Update progress: after item creation, go straight from `setUploadProgress(60)` to `setUploadProgress(100)` (remove the intermediate 70, 85 steps that tracked BG removal progress).

- [ ] **Step 3: Verify add.tsx has no remaining backgroundRemoval references**

Run: `grep -n "backgroundRemoval\|removeBackground\|processedUrl\|bgError\|bgRemoval" apps/mobile/app/\(tabs\)/add.tsx`
Expected: No results.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/add.tsx
git commit -m "feat: remove blocking background removal from add.tsx

Product photo generation now happens on the confirm-item screen instead.
This makes the upload flow faster — no blocking wait for image processing."
```

---

### Task 4: Update Storage Path Pattern

**Files:**
- Modify: `apps/mobile/services/storage.ts:~126`

- [ ] **Step 1: Read `uploadProcessedImage` in storage.ts**

Read `apps/mobile/services/storage.ts` around lines 119-140 to find the exact file path construction.

- [ ] **Step 2: Update the path pattern**

Change the file path from `processed_{timestamp}.png` to `{timestamp}_product.png`:

```typescript
// Old:
const filename = `${userId}/processed_${timestamp}.png`;
// New:
const filename = `${userId}/${timestamp}_product.png`;
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/storage.ts
git commit -m "feat: update processed image path to _product.png naming convention"
```

---

### Task 5: Add Product Photo Generation to Confirm Item

**Files:**
- Modify: `apps/mobile/app/(tabs)/confirm-item.tsx`

This is the most significant change. Currently, confirm-item.tsx only runs categorization. We add background product photo generation with shimmer overlay and crossfade.

- [ ] **Step 1: Read confirm-item.tsx fully**

Read the entire file. Key areas:
- Imports (~lines 1-30)
- State variables (~lines 40-80)
- `analyzeClothing` call (~line 128) inside `useFocusEffect` or `useEffect`
- Image display (~line 306-309): `<Image source={{ uri: params.imageUrl }} />`
- `handleConfirm` function (~lines 183-260): calls `itemsService.updateItem(params.itemId, {...})`
- StyleSheet at the bottom

Note: `confirm-item.tsx` does NOT have `user.id` in scope. For the product photo upload in `handleConfirm`, we need to get the user ID. Import `supabase` from the services and call `supabase.auth.getUser()`, or import a `useAuth` hook if one exists. Check what `add.tsx` does — it has `user` from a `useAuth()` hook.

- [ ] **Step 2: Add imports**

```typescript
import { generateProductPhoto } from '../../services/productPhotoService';
import { storageService } from '../../services/storage';
import { Animated } from 'react-native';
import { useRef } from 'react'; // if not already imported
```

Also add whatever auth import is needed for `user.id` (check how `add.tsx` gets it).

- [ ] **Step 3: Add state for product photo generation**

Add alongside existing state variables:

```typescript
const [productPhotoBase64, setProductPhotoBase64] = useState<string | null>(null);
const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
const [showEnhancedBadge, setShowEnhancedBadge] = useState(false);
const fadeAnim = useRef(new Animated.Value(0)).current;
```

- [ ] **Step 4: Trigger product photo generation after categorization**

Find where `analyzeClothing` resolves and form fields are populated (~line 128+). After setting form fields from the analysis result, kick off product photo generation as fire-and-forget:

```typescript
// After analyzeClothing completes and form fields are set:
if (analysis) {
    setIsGeneratingPhoto(true);
    generateProductPhoto(params.imageUrl, {
        category: analysis.category,
        subCategory: analysis.subCategory,
        colors: analysis.colors,
        pattern: analysis.pattern,
    }).then(({ processedImageBase64 }) => {
        if (processedImageBase64) {
            setProductPhotoBase64(processedImageBase64);
            setShowEnhancedBadge(true);
            // Crossfade animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }).catch(() => {
        // Silent failure — original photo kept
    }).finally(() => {
        setIsGeneratingPhoto(false);
    });
}
```

- [ ] **Step 5: Update the image display area**

Replace the current static `<Image>` (~line 306-309) with shimmer + crossfade UI:

```tsx
<View style={styles.imageContainer}>
    {/* Original photo — visible initially, hidden after product photo loads */}
    <Image
        source={{ uri: params.imageUrl }}
        style={[styles.previewImage, productPhotoBase64 ? { opacity: 0 } : undefined]}
    />

    {/* Product photo — fades in on success */}
    {productPhotoBase64 && (
        <Animated.Image
            source={{ uri: `data:image/png;base64,${productPhotoBase64}` }}
            style={[styles.previewImage, styles.overlayImage, { opacity: fadeAnim }]}
        />
    )}

    {/* Shimmer overlay during generation */}
    {isGeneratingPhoto && (
        <View style={styles.shimmerOverlay}>
            <Text style={styles.enhancingText}>Enhancing photo...</Text>
        </View>
    )}

    {/* Enhanced badge — shows briefly on success */}
    {showEnhancedBadge && (
        <View style={styles.enhancedBadge}>
            <Text style={styles.enhancedBadgeText}>Enhanced ✓</Text>
        </View>
    )}
</View>
```

- [ ] **Step 6: Add styles**

Add to the StyleSheet at the bottom:

```typescript
imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
},
overlayImage: {
    position: 'absolute',
    top: 0,
},
shimmerOverlay: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
},
enhancingText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
},
enhancedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
},
enhancedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
},
```

- [ ] **Step 7: Update `handleConfirm` to save both images**

In `handleConfirm` (~line 183), before the `itemsService.updateItem` call, upload the product photo if available and add both URLs to the update:

```typescript
const handleConfirm = async () => {
    if (!params.itemId) return;
    setIsSaving(true);
    try {
        // Upload product photo if available
        let productPhotoUrl: string | null = null;
        if (productPhotoBase64) {
            // Get user ID for storage path
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { url } = await storageService.uploadProcessedImage(user.id, productPhotoBase64);
                productPhotoUrl = url;
            }
        }

        const { error } = await itemsService.updateItem(params.itemId, {
            category: selectedCategory,
            sub_category: selectedSubCategory,
            colors: selectedColors,
            name: itemName || null,
            brand: brand || null,
            purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
            currency: currency,
            seasons: selectedSeasons.length > 0 ? selectedSeasons : null,
            occasions: selectedOccasions.length > 0 ? selectedOccasions : null,
            status: 'complete',
            // Save product photo as main display image, keep original as backup
            ...(productPhotoUrl && { image_url: productPhotoUrl }),
        } as any);
        // ... rest of handleConfirm unchanged (gamification, badges, etc.)
```

Note: if `productPhotoBase64` is null (generation not finished or failed), the update simply doesn't include `image_url`, leaving the original URL that was set in `add.tsx`.

Import `supabase` at the top: `import { supabase } from '../../services/supabase';`

- [ ] **Step 8: Add the "Enhanced ✓" badge auto-dismiss**

```typescript
useEffect(() => {
    if (showEnhancedBadge) {
        const timer = setTimeout(() => setShowEnhancedBadge(false), 2000);
        return () => clearTimeout(timer);
    }
}, [showEnhancedBadge]);
```

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/app/(tabs)/confirm-item.tsx
git commit -m "feat: add product photo generation to confirm-item screen

Shows original photo immediately, generates product photo in background
using categorization metadata, crossfades when ready. Silent fallback
to original on failure or early submission."
```

---

### Task 6: Update Extraction Types and Messages

**Files:**
- Modify: `apps/mobile/types/extraction.ts:59-70`
- Modify: `apps/mobile/utils/extractionMessages.ts:9,18-25,48-52,89-95`

- [ ] **Step 1: Update `extraction.ts` types**

1. Rename `bg_removal_status` → `photo_gen_status` in `ProcessedDetectedItem` (~line 62):

```typescript
// Old:
bg_removal_status: 'pending' | 'success' | 'failed' | 'skipped';
// New:
photo_gen_status: 'pending' | 'success' | 'failed' | 'skipped';
```

2. Rename `BgRemovalProgress` → `PhotoGenProgress` (~line 65-70):

```typescript
// Old:
export interface BgRemovalProgress { ... }
// New:
export interface PhotoGenProgress { ... }
```

(Same fields — just the name changes.)

- [ ] **Step 2: Update `extractionMessages.ts`**

1. Update `ExtractionPhase` type (~line 9):

```typescript
// Old:
export type ExtractionPhase = 'upload' | 'detection' | 'bgRemoval' | 'import';
// New:
export type ExtractionPhase = 'upload' | 'detection' | 'photoGen' | 'import';
```

2. Replace every `bgRemoval` key with `photoGen` in all message/title/time-estimate objects. Update user-facing copy:

```typescript
// Status message:
photoGen: `Generating product photos... ${progress.done} of ${progress.total}`,

// Phase title:
photoGen: 'Generating product photos...',

// Time estimate (keep same 4s value — reasonable for image gen):
photoGen: 4,
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/types/extraction.ts apps/mobile/utils/extractionMessages.ts
git commit -m "refactor: rename bg removal types/messages to product photo generation"
```

---

### Task 7: Create Batch Product Photo Service

**Files:**
- Create: `apps/mobile/services/batchProductPhotoService.ts` (replaces `batchBgRemovalService.ts`)

- [ ] **Step 1: Read the existing `batchBgRemovalService.ts` fully**

Read `apps/mobile/services/batchBgRemovalService.ts`. Note:
- The `processExtractedItems` function (~lines 37-132)
- Any other exported functions (`trackUsage`, `getMonthlyUsage`, `getEstimatedTime`)
- How it calls `removeBackground` (~line 83)
- How it sets `bg_removal_status` (~lines 99-111)
- The progress callback signature (~line 65)

- [ ] **Step 2: Create `batchProductPhotoService.ts`**

Mirror the entire structure of the old service, but:
- Import `generateProductPhoto` from `./productPhotoService` instead of `removeBackground` from `./backgroundRemoval`
- Use `PhotoGenProgress` type instead of `BgRemovalProgress`
- Pass metadata to `generateProductPhoto`:

```typescript
// Old (~line 83):
const { processedImageBase64, error: bgError } = await removeBackground(item.photo_url);

// New:
const { processedImageBase64, error: genError } = await generateProductPhoto(
    item.photo_url,
    {
        category: item.category?.toLowerCase(),
        subCategory: item.sub_category,
        colors: item.colors,
        pattern: item.pattern,
    }
);
```

- Set `photo_gen_status` instead of `bg_removal_status`:

```typescript
// Old: item.bg_removal_status = 'success' / 'failed'
// New: item.photo_gen_status = 'success' / 'failed'
```

- Preserve all utility methods (`trackUsage`, `getMonthlyUsage`, `getEstimatedTime`) with updated key prefixes (change `bg_removal_usage_` to `product_photo_usage_` if applicable).

- [ ] **Step 3: Delete old `batchBgRemovalService.ts`**

```bash
rm apps/mobile/services/batchBgRemovalService.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/services/batchProductPhotoService.ts
git rm apps/mobile/services/batchBgRemovalService.ts
git commit -m "feat: create batchProductPhotoService replacing batchBgRemovalService

Passes categorization metadata to product photo generation for each item."
```

---

### Task 8: Update Extraction Store

**Files:**
- Modify: `apps/mobile/stores/extractionStore.ts`

This file has many BG removal references across multiple actions. Read the full file before making changes.

- [ ] **Step 1: Read the full extractionStore.ts**

Read the entire file. Find ALL occurrences of:
- `batchBgRemovalService` (import)
- `BgRemovalProgress` (import and type usage)
- `isBgRemoving` (state field, initial state, reset)
- `bgRemovalProgress` (state field, initial state, reset)
- `startBgRemoval` (interface declaration, implementation, all call sites)
- `bg_removal_status` (JSONB merge in `startBgRemoval`, `initReview`, anywhere else)

Key locations to check:
- Import section (~top)
- `ExtractionState` interface (~line 35-36)
- `ExtractionActions` interface (~line 58: `startBgRemoval` declaration)
- Initial state (~line 89-90)
- `startProcessing` action (~line 211: calls `get().startBgRemoval(...)`)
- `startBgRemoval` action (~line 215-276)
- `initReview` action (~line 371: sets `bg_removal_status`)
- `retryFailedPhotos` or similar (~line 519-520: calls `get().startBgRemoval(...)`)
- `reset` action (~line 529-556: resets `isBgRemoving`, `bgRemovalProgress`)

- [ ] **Step 2: Update all references**

1. **Imports**: Replace `batchBgRemovalService` with `batchProductPhotoService`. Replace `BgRemovalProgress` with `PhotoGenProgress`.

2. **State interface** (~line 35-36):
```typescript
isGeneratingPhotos: boolean;         // was isBgRemoving
photoGenProgress: PhotoGenProgress | null;  // was bgRemovalProgress
```

3. **Actions interface** (~line 58):
```typescript
startPhotoGeneration: (jobId: string) => Promise<void>;  // was startBgRemoval
```

4. **Initial state** (~line 89-90):
```typescript
isGeneratingPhotos: false,     // was isBgRemoving
photoGenProgress: null,        // was bgRemovalProgress
```

5. **`startProcessing`** (~line 211):
```typescript
get().startPhotoGeneration(updatedJob.id);  // was get().startBgRemoval(...)
```

6. **`startBgRemoval` → `startPhotoGeneration`** (~line 215-276): Rename the action. Inside:
   - `set({ isGeneratingPhotos: true })` (was `isBgRemoving`)
   - `set({ photoGenProgress: ... })` (was `bgRemovalProgress`)
   - Call `batchProductPhotoService.processExtractedItems(...)` (was `batchBgRemovalService`)
   - `photo_gen_status` in JSONB merge (was `bg_removal_status`)
   - `set({ isGeneratingPhotos: false })` in finally block

7. **`initReview`** (~line 371):
```typescript
photo_gen_status: (item as ProcessedDetectedItem).photo_gen_status || 'skipped',
// was bg_removal_status
```

8. **`retryFailedPhotos`** or similar (~line 519-520):
```typescript
get().startPhotoGeneration(updatedJob.id);  // was get().startBgRemoval(...)
```

9. **`reset`** (~line 529-556):
```typescript
isGeneratingPhotos: false,     // was isBgRemoving
photoGenProgress: null,        // was bgRemovalProgress
```

- [ ] **Step 3: Verify no remaining `bg` references**

Run: `grep -n "bg_removal\|BgRemoval\|bgRemoval\|isBgRemoving\|batchBgRemoval" apps/mobile/stores/extractionStore.ts`
Expected: No results.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/stores/extractionStore.ts
git commit -m "refactor: rename all extraction store bg removal fields to product photo gen"
```

---

### Task 9: Update Bulk Upload UI

**Files:**
- Modify: `apps/mobile/app/(tabs)/bulk-upload.tsx`

- [ ] **Step 1: Read bulk-upload.tsx**

Read the full file. Find ALL BG removal references. Key locations:
- Import of `batchBgRemovalService` (~line 16)
- Store variable destructuring: `isBgRemoving`, `bgRemovalProgress` (~lines 34-35)
- Phase determination: `if (isBgRemoving) return 'bgRemoval'` (~line 67-68)
- Progress calculation for `bgRemoval` phase (~line 97-98)
- Progress message text (~line 229: `'Cleaning up backgrounds...'`)
- Inline stats: `bgRemovalProgress.succeeded`, `bgRemovalProgress.failed` (~lines 241-250)
- `renderComplete` function: `bg_removal_status === 'success'` and `'failed'` (~lines 282-283)
- Complete stats display text (~lines 355-359: `"backgrounds cleaned"` copy)

- [ ] **Step 2: Update imports**

```typescript
// Old:
import { batchBgRemovalService } from '../../services/batchBgRemovalService';
// New:
import { batchProductPhotoService } from '../../services/batchProductPhotoService';
```

- [ ] **Step 3: Update store variable destructuring**

```typescript
// Old:
isBgRemoving, bgRemovalProgress,
// New:
isGeneratingPhotos, photoGenProgress,
```

- [ ] **Step 4: Update phase determination**

```typescript
// Old:
if (isBgRemoving) return 'bgRemoval';
// New:
if (isGeneratingPhotos) return 'photoGen';
```

- [ ] **Step 5: Update progress calculation**

```typescript
// Old:
if (phase === 'bgRemoval' && bgRemovalProgress) return Math.round((bgRemovalProgress.processed / bgRemovalProgress.total) * 100);
// New:
if (phase === 'photoGen' && photoGenProgress) return Math.round((photoGenProgress.processed / photoGenProgress.total) * 100);
```

- [ ] **Step 6: Update inline stats, renderComplete, and user-facing copy**

- Replace `bgRemovalProgress.succeeded` / `.failed` → `photoGenProgress.succeeded` / `.failed`
- In `renderComplete` (~lines 282-283): replace `bg_removal_status === 'success'` → `photo_gen_status === 'success'` (and `'failed'`)
- Update text: `'backgrounds cleaned'` → `'product photos generated'` (or similar)
- Update any other `'Cleaning...'` text → `'Generating product photos...'`

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/(tabs)/bulk-upload.tsx
git commit -m "feat: update bulk upload UI for product photo generation"
```

---

### Task 10: Update Review Items Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/review-items.tsx:154`

- [ ] **Step 1: Update bg_removal_status reference**

In `apps/mobile/app/(tabs)/review-items.tsx`, line 154:

```typescript
// Old:
const bgFailed = item.bg_removal_status === 'failed';
// New:
const bgFailed = item.photo_gen_status === 'failed';
```

Optionally rename the variable too: `const photoGenFailed = item.photo_gen_status === 'failed';` and update all uses of `bgFailed` in that function.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/review-items.tsx
git commit -m "fix: update review-items to use photo_gen_status instead of bg_removal_status"
```

---

### Task 11: Update Test Files

**Files:**
- Delete: `apps/mobile/__tests__/services/batchBgRemovalService.test.ts`
- Modify: `apps/mobile/__tests__/stores/extractionStore.background.test.ts`
- Modify: `apps/mobile/__tests__/stores/extractionStore.review.test.ts`

- [ ] **Step 1: Delete the old batch service test**

```bash
rm apps/mobile/__tests__/services/batchBgRemovalService.test.ts
```

- [ ] **Step 2: Update extractionStore.background.test.ts**

Read the file. Update:
- Mock imports: `batchBgRemovalService` → `batchProductPhotoService`
- Mock paths: `../../services/batchBgRemovalService` → `../../services/batchProductPhotoService`
- State field references: `isBgRemoving` → `isGeneratingPhotos`, `bgRemovalProgress` → `photoGenProgress`
- Action calls: `startBgRemoval` → `startPhotoGeneration`
- Status fields: `bg_removal_status` → `photo_gen_status`

- [ ] **Step 3: Update extractionStore.review.test.ts**

Read the file. Update:
- `bg_removal_status` → `photo_gen_status` in test data and assertions

- [ ] **Step 4: Commit**

```bash
git rm apps/mobile/__tests__/services/batchBgRemovalService.test.ts
git add apps/mobile/__tests__/stores/extractionStore.background.test.ts apps/mobile/__tests__/stores/extractionStore.review.test.ts
git commit -m "test: update test files for product photo generation rename"
```

---

### Task 12: Cleanup and Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Search for any remaining `backgroundRemoval` or `bg_removal` references**

```bash
grep -rn "backgroundRemoval\|bg_removal\|BACKGROUND_REMOVAL\|batchBgRemoval\|isBgRemoving\|bgRemovalProgress\|bg_removal_status\|BgRemovalProgress\|removeBackground\|isBackgroundRemoval" apps/mobile/ --include="*.ts" --include="*.tsx"
```

Expected: No results. If any remain, fix them.

- [ ] **Step 2: Check TypeScript compilation**

Run: `npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | head -50`

Fix any type errors. Note: pre-existing TS errors in `_layout.tsx`, `SwipeableOutfitCard.tsx`, and `aiCategorization.ts` are known and unrelated — ignore those.

- [ ] **Step 3: Test the single-item flow end-to-end**

1. Open the app
2. Add a new wardrobe item (camera or gallery)
3. Verify: `add.tsx` uploads quickly (no BG removal wait)
4. Verify: confirm-item shows original photo → shimmer "Enhancing..." → product photo crossfade → "Enhanced ✓" badge (2s)
5. Tap "Looks Good" → item saved to wardrobe
6. Check wardrobe grid: item shows the product photo
7. Verify in Supabase: `image_url` is the product photo URL, `original_image_url` is the original

- [ ] **Step 4: Test the early submission edge case**

1. Add a new item
2. Immediately tap "Looks Good" before the product photo generates
3. Verify: item saves with the original photo (no crash, no error, no hanging)

- [ ] **Step 5: Test the bulk upload flow**

1. Go to bulk upload
2. Upload a photo with multiple items
3. Verify: "Generating product photos..." phase runs (not "Cleaning backgrounds...")
4. Verify: each item gets a product photo in the review screen

- [ ] **Step 6: Test failure graceful degradation**

Temporarily break the AI proxy (e.g., disconnect network) and add an item.
Verify: original photo is saved, no error shown to user.

- [ ] **Step 7: Final commit (only if Step 1 found remaining references)**

```bash
git add -A
git commit -m "chore: cleanup remaining bg removal references"
```
