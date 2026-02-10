# Epic 6: 🎮 Gamification System

**Goal:** Implement engagement mechanics that reward users for building their wardrobe through levels, streaks, and badges.

---

## Story 6.1: Style Points System

> **As a** user,  
> **I want** to earn style points for my actions,  
> **so that** I feel rewarded for engaging with the app.

### Acceptance Criteria

1. Points earned for: upload item (+10), log outfit (+5), complete streak day (+3)
2. Bonus points for: first item of day (+2), completing challenges (+20-50)
3. Points total displayed on Profile screen
4. Points history viewable (last 30 days)
5. Animation on point earn (floating +10)
6. Database: `user_stats` table tracks total points

---

## Story 6.2: User Levels & Progression

> **As a** user,  
> **I want** to level up as I use the app,  
> **so that** I feel a sense of achievement.

### Acceptance Criteria

1. 6 levels: Closet Rookie → Style Master
2. Levels based on item count thresholds (0, 10, 25, 50, 100, 200)
3. Level displayed prominently on Profile screen
4. Progress bar shows progress to next level
5. Level-up celebration animation when threshold reached
6. Level unlocks displayed
7. Level badge visible on user avatar

### Level Definitions

| Level | Title | Threshold |
|-------|-------|-----------|
| 1 | Closet Rookie | 0 items |
| 2 | Wardrobe Builder | 10 items |
| 3 | Style Explorer | 25 items |
| 4 | Fashion Curator | 50 items |
| 5 | Trend Setter | 100 items |
| 6 | Style Master | 200+ items |

---

## Story 6.3: Streak Tracking

> **As a** user,  
> **I want** to maintain a daily streak by logging outfits,  
> **so that** I stay motivated to use the app consistently.

### Acceptance Criteria

1. Streak counter tracks consecutive days with outfit logs
2. Current streak displayed on Home and Profile screens
3. Streak fire icon 🔥 with day count
4. Streak breaks if no outfit logged by midnight
5. Grace period: 1 "freeze" per week to protect streak
6. Streak milestones: 7, 30, 100 days trigger rewards
7. Streak lost notification with encouragement message

---

## Story 6.4: Badges & Achievements

> **As a** user,  
> **I want** to earn badges for achievements,  
> **so that** I have collectible goals to work toward.

### Acceptance Criteria

1. Badge categories: Upload, Engagement, Sustainability, Secret
2. At least 12 badges implemented for MVP
3. Badges displayed in grid on Profile screen
4. Locked badges shown as silhouettes with hints
5. Badge unlock triggers celebration animation
6. Push notification for significant badge unlocks
7. Badge showcase: user can select 1-3 featured badges

### Badge List

| Badge | Category | Requirement |
|-------|----------|-------------|
| First Step | Upload | Upload first item |
| Closet Complete | Upload | Upload 50 items |
| Week Warrior | Engagement | 7-day streak |
| Streak Legend | Engagement | 30-day streak |
| Early Bird | Engagement | Log outfit before 8 AM |
| Rewear Champion | Sustainability | Wear same item 10+ times |
| Circular Seller | Sustainability | Create first resale listing |
| Monochrome Master | Secret | Create all-black outfit |
| Rainbow Warrior | Secret | Own items in 7+ colors |
| OG Member | Secret | User since launch month |
| Weather Warrior | Secret | Log outfit in rain/snow |
| Style Guru | Upload | Upload 100 items |

---

## Story 6.5: Sustainability Score

> **As a** user,  
> **I want** to see my sustainability score,  
> **so that** I can track my eco-friendly fashion habits.

### Acceptance Criteria

1. Score calculated 0-100 based on wardrobe utilization
2. Factors: avg wear count, % items worn recently, CPW average
3. Score displayed on Analytics dashboard
4. Comparison: "Top 15% of Vestiaire users!"
5. Tips to improve score
6. Score recalculated weekly
7. Visual: leaf icon with score, color gradient

---

## Story 6.6: Closet Safari Challenge (Onboarding)

> **As a** new user,  
> **I want** to participate in the "Closet Safari" challenge,  
> **so that** I'm motivated to quickly build my wardrobe.

### Acceptance Criteria

1. Challenge offered after signup: "Upload 20 items in 7 days"
2. Progress tracker: "12/20 items, 4 days remaining"
3. Daily reminder notifications during challenge
4. Reward: 1 month Premium free upon completion
5. Challenge badge unlocked for participation
6. Challenge can be skipped
7. One-time challenge, not repeatable

---

## Story 6.7: Gamification Profile View

> **As a** user,  
> **I want** a dedicated view showing all my gamification progress,  
> **so that** I can see my full achievement history.

### Acceptance Criteria

1. Gamification section on Profile tab
2. Shows: current level, XP progress, current streak, total points
3. Badge collection grid with earned/locked status
4. Recent activity feed (last 5 events)
5. Leaderboard placeholder (future social feature)
6. Share button to export achievements card
