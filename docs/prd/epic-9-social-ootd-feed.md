# Epic 9: 📸 Social OOTD Feed

**Goal:** Create private Style Squads where users share daily outfits with close friends for inspiration and social validation.

---

## Story 9.1: Style Squads Creation

> **As a** user,  
> **I want** to create a private friend group,  
> **so that** I can share my outfits with a select circle.

### Acceptance Criteria

1. "Create Style Squad" button in Social tab
2. Squad setup: name, optional description, invite code
3. Invite friends via: unique code, SMS, or username search
4. Squad size limit: 20 members (BeReal-style intimacy)
5. User can belong to multiple squads
6. Squad member list visible with profile pictures
7. Squad admin can remove members

---

## Story 9.2: OOTD Posting Flow

> **As a** user,  
> **I want** to post my daily outfit to my Style Squad,  
> **so that** my friends can see what I'm wearing today.

### Acceptance Criteria

1. "Post OOTD" button on Social tab (camera icon)
2. Camera opens for selfie/mirror photo
3. Option to select from gallery if already taken
4. Tag wardrobe items in outfit (tap to select)
5. Optional caption (max 150 characters)
6. Select which Squad(s) to post to
7. "Post" button publishes to feed
8. Confirmation: "Posted to Style Squad! 📸"
9. Posted OOTD shows: photo, tagged items, caption, timestamp

---

## Story 9.3: OOTD Feed Display

> **As a** user,  
> **I want** to see my friends' daily outfits,  
> **so that** I can get inspired and stay connected.

### Acceptance Criteria

1. Social tab shows chronological feed of OOTD posts
2. Feed combines posts from all joined Squads
3. Each post shows: user avatar, name, outfit photo, caption, timestamp
4. Tap photo to expand full-screen
5. Tagged items displayed below photo (thumbnails)
6. Filter by: All Squads, specific Squad
7. Pull-to-refresh updates feed
8. Loading skeleton while fetching posts

---

## Story 9.4: Reactions & Comments

> **As a** user viewing friend's OOTD,  
> **I want** to react and comment,  
> **so that** I can engage and validate their style.

### Acceptance Criteria

1. Reaction button: 🔥 (fire emoji, single tap)
2. Reaction count displayed on post
3. Comment button opens comment sheet
4. Comments support text only (no photos)
5. Comment character limit: 200
6. Comment notifications sent to post author
7. User can delete their own comments
8. Post author can delete any comments on their post

---

## Story 9.5: "Steal This Look" Feature

> **As a** user inspired by friend's outfit,  
> **I want** to recreate it with my own wardrobe,  
> **so that** I can try similar style combinations.

### Acceptance Criteria

1. "Steal This Look" button on OOTD posts
2. App identifies similar items in user's wardrobe
3. Suggests closest matches by category, color, style
4. If exact match exists: "You have the same jacket!"
5. If similar: "Try your navy blazer instead of black"
6. If missing: "You don't have X. Want to add it to wishlist?"
7. Creates saved outfit in user's collection with attribution

---

## Story 9.6: OOTD Notifications

> **As a** user,  
> **I want** to be notified when friends post outfits,  
> **so that** I don't miss their daily looks.

### Acceptance Criteria

1. Push notification when Squad member posts OOTD
2. Notification text: "Sarah just posted her OOTD! 📸"
3. Tap opens app to that specific post
4. Notification settings: All posts, Only morning posts, Off
5. Quiet hours respected (default: no notifications 10 PM - 7 AM)
6. Batch notifications if multiple posts (max 3/day)

---

## Story 9.7: OOTD Posting Reminder

> **As a** user,  
> **I want** a daily reminder to post my outfit,  
> **so that** I stay consistent with sharing.

### Acceptance Criteria

1. Optional morning reminder (default: 9 AM)
2. Notification: "What are you wearing today? Share with your Squad! 📸"
3. Skipped if user already posted today
4. User-configurable time in settings
5. Can be disabled entirely
6. BeReal-style variant (future): Random time each day
