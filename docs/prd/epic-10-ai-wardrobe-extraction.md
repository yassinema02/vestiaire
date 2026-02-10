# Epic 10: ✨ AI Wardrobe Extraction

**Goal:** Eliminate onboarding friction by allowing users to bulk upload photos (Instagram, selfies, gallery) and automatically extract clothing items via AI.

---

## Story 10.1: Bulk Photo Upload

> **As a** new user,  
> **I want** to upload multiple photos at once,  
> **so that** I can populate my wardrobe quickly.

### Acceptance Criteria

1. "Magic Wardrobe Import" button on Wardrobe screen
2. Options: "Upload from Gallery", "Connect Instagram" (future)
3. Multi-select interface for gallery (up to 50 photos)
4. Upload progress bar for batch
5. Photos stored temporarily in Supabase Storage
6. Batch processing queue created
7. Estimated time displayed: "Analyzing 20 photos... ~2 minutes"

---

## Story 10.2: Multi-Item Detection

> **As a** system,  
> **I want** to detect all clothing items in a photo,  
> **so that** users get maximum value from each image.

### Acceptance Criteria

1. Gemini 1.5 Pro processes each photo to detect items
2. Prompt identifies: tops, bottoms, shoes, jackets, accessories worn/visible
3. Returns array of detected items per photo
4. Each item includes: category, color, style, position in photo
5. Edge Function handles batch processing (queue system)
6. Processing limited to 5 items per photo max
7. Fallback: If detection fails, skip photo with note

---

## Story 10.3: Background Removal for Extracted Items

> **As a** user,  
> **I want** extracted items to have clean backgrounds,  
> **so that** my wardrobe gallery looks professional.

### Acceptance Criteria

1. Each detected item sent to Remove.bg API
2. Background removal applied
3. Processed images stored in user's wardrobe bucket
4. If background removal fails, original cropped item used
5. Batch processing optimized (parallel API calls)
6. Cost tracking: log API usage per user

---

## Story 10.4: Review & Confirm Interface

> **As a** user after photo extraction,  
> **I want** to review detected items before adding to wardrobe,  
> **so that** I can correct mistakes and remove unwanted items.

### Acceptance Criteria

1. "Review Extracted Items" screen shows all detected items
2. Grid layout with item preview, category, color
3. Each item has: ✓ Keep, ✕ Remove toggles
4. Tap item to edit: category, color, name
5. Batch actions: "Keep All", "Remove All Accessories"
6. Confirmation summary: "22 items ready to add"
7. "Add to Wardrobe" button imports confirmed items

---

## Story 10.5: Auto-Categorization for Extracted Items

> **As a** system,  
> **I want** to auto-categorize extracted items accurately,  
> **so that** users have minimal editing to do.

### Acceptance Criteria

1. Gemini assigns category, color, style, material for each item
2. Accuracy target: ≥85% for category, ≥75% for color
3. Confidence scores returned (optional manual review if <70%)
4. Metadata stored: extraction_source="photo_import", original_photo_url
5. Items tagged with creation_method="ai_extraction"
6. Duplicate detection: warn if similar item already exists

---

## Story 10.6: Extraction Progress & Feedback

> **As a** user during extraction,  
> **I want** to see progress and status updates,  
> **so that** I know the process is working.

### Acceptance Criteria

1. Progress screen with animated indicator
2. Status updates: "Processing photo 5 of 20...", "Removing backgrounds...", "Almost done!"
3. Estimated time remaining displayed
4. Allow user to background the process (continue using app)
5. Push notification when complete: "Your wardrobe is ready! 22 items added ✨"
6. Error handling: "3 photos failed. Retry or skip?"
7. Final summary: "Added 22 items from 18 photos"
