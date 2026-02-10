# Epic 2: 👗 Digital Wardrobe Core

**Goal:** Enable users to build their digital wardrobe by photographing clothing items, automatically removing backgrounds, and organizing items by category and color.

---

## Story 2.1: Camera Capture & Image Upload

> **As a** user,  
> **I want** to take a photo of my clothing item directly in the app,  
> **so that** I can quickly add items to my wardrobe.

### Acceptance Criteria

1. "Add Item" button opens camera with photo capture option
2. Option to select from photo library as alternative
3. Image preview shown before confirming upload
4. Images compressed to max 2MB before upload
5. Upload progress indicator displayed
6. Image stored in Supabase Storage with signed URL
7. Camera permission request handled gracefully

---

## Story 2.2: Automatic Background Removal

> **As a** user,  
> **I want** the background automatically removed from my clothing photos,  
> **so that** my wardrobe looks clean and professional.

### Acceptance Criteria

1. Background removal triggered automatically after upload
2. Processing indicator shown during removal (3-5 seconds)
3. Original and processed images both stored
4. Processed image displayed in wardrobe gallery
5. Fallback: if removal fails, original image used with notification
6. Integration with remove.bg API or Edge Function using rembg

---

## Story 2.3: Auto-Categorization & Color Detection

> **As a** user,  
> **I want** my clothing items automatically categorized and color-detected,  
> **so that** I don't have to manually tag everything.

### Acceptance Criteria

1. AI analyzes image and suggests category (tops, bottoms, shoes, outerwear, accessories)
2. Dominant color(s) extracted and assigned to item
3. Suggestions presented to user for confirmation/editing
4. User can override AI suggestions with manual selection
5. Category and color stored in database with item record
6. Sub-categories available (e.g., tops → t-shirt, blouse, sweater)

---

## Story 2.4: Item Metadata Entry

> **As a** user,  
> **I want** to add details about my clothing item,  
> **so that** I can track its value and get better recommendations.

### Acceptance Criteria

1. Form fields: name (optional), brand, purchase price, purchase date
2. Season tags: Spring, Summer, Fall, Winter, All-Season
3. Occasion tags: Casual, Work, Formal, Sport, Night Out
4. All fields optional except category and color
5. Data saved to `items` table with user relationship
6. Form can be completed later (item saved as draft)

---

## Story 2.5: Wardrobe Gallery View

> **As a** user,  
> **I want** to see all my clothing items in a visual gallery,  
> **so that** I can browse my wardrobe easily.

### Acceptance Criteria

1. Masonry grid layout displaying all items with background-removed images
2. Filter by category (tabs or dropdown)
3. Filter by color (color swatches)
4. Filter by season and occasion
5. Sort options: newest, oldest, most worn, least worn
6. Search by item name or brand
7. Empty state with CTA to add first items
8. Pull-to-refresh updates gallery

---

## Story 2.6: Item Detail View

> **As a** user,  
> **I want** to view and edit details of a single item,  
> **so that** I can update information or see item stats.

### Acceptance Criteria

1. Full-size image display with zoom capability
2. All metadata displayed (name, brand, category, color, price, date)
3. Edit button allows modifying any field
4. Statistics shown: wear count (placeholder for Epic 5)
5. "Delete item" option with confirmation dialog
6. "Mark as favorite" toggle
7. Swipe gestures to navigate between items

---

## Story 2.7: Onboarding "First 5 Items" Challenge

> **As a** new user,  
> **I want** to be guided to upload my first 5 items,  
> **so that** I can start using AI features quickly.

### Acceptance Criteria

1. After sign-up, onboarding flow prompts to add 5 items
2. Progress indicator: "2/5 items added"
3. Skip option available (with warning about limited functionality)
4. Celebration animation upon completing 5 items
5. AI features unlocked message displayed
6. Onboarding state persisted (not shown again)
