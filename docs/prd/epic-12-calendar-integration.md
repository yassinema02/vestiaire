# Epic 12: 📅 Calendar Integration & Outfit Planning

**Goal:** Integrate with user's calendar to provide proactive outfit suggestions for upcoming events, reducing morning decision fatigue.

---

## Story 12.1: Calendar Permission & Connection

> **As a** user,  
> **I want** to connect my phone calendar,  
> **so that** the app can suggest outfits for my events.

### Acceptance Criteria

1. "Connect Calendar" in Settings
2. iOS: EventKit permission request
3. Android: Google Calendar OAuth
4. Permission explanation: "We'll suggest outfits for your meetings and events"
5. User selects which calendars to include (work, personal, etc.)
6. Calendar sync status displayed
7. Option to disconnect at any time

---

## Story 12.2: Event Detection & Classification

> **As a** system,  
> **I want** to detect and classify calendar events,  
> **so that** outfit suggestions are contextually appropriate.

### Acceptance Criteria

1. Fetch today's and next 7 days' events
2. AI classifies event based on title/description:
   - Work: meeting, presentation, interview
   - Social: dinner, party, date, drinks
   - Active: gym, hike, sports
   - Formal: wedding, gala, funeral
   - Casual: brunch, coffee, errands
3. Formality score assigned (1-10)
4. Events stored with classification in `calendar_events` table
5. Re-classification option if AI wrong
6. All-day events handled (suggest casual by default)

---

## Story 12.3: Event-Based Outfit Suggestions

> **As a** user with upcoming events,  
> **I want** to see outfit suggestions for each event,  
> **so that** I can plan what to wear.

### Acceptance Criteria

1. Home screen shows: "Upcoming: Client Presentation (Formal)"
2. Outfit suggestion generated for formality + weather
3. Event time considered: "Tonight's dinner → evening-appropriate outfit"
4. Multiple events in one day: prioritize highest formality
5. "See All Events" shows next 7 days with suggestions
6. Regenerate button for each event
7. Outfit automatically considers weather forecast for event time

---

## Story 12.4: Outfit Scheduling & Planning

> **As a** user who plans ahead,  
> **I want** to schedule outfits for future days,  
> **so that** I'm prepared all week.

### Acceptance Criteria

1. "Plan Week" screen shows 7-day calendar
2. Each day shows events and weather preview
3. Tap day to assign/create outfit
4. Planned outfits displayed on calendar
5. Edit/remove scheduled outfits
6. Morning notification includes: "Today's planned outfit: Blue suit + white shirt"
7. Scheduled outfits stored in `calendar_outfits` table

---

## Story 12.5: Outfit Reminders

> **As a** user,  
> **I want** reminders before events requiring specific attire,  
> **so that** I don't forget preparation (ironing, dry cleaning).

### Acceptance Criteria

1. Reminder notification: "Your meeting is tomorrow. Don't forget to iron your shirt 👔"
2. Sent evening before event (default: 8 PM)
3. Only for formal/work events
4. User can snooze or mark as done
5. Configurable: timing, event types
6. Smart tips: "Your blazer is at the dry cleaners. Pick it up today."

---

## Story 12.6: Travel Mode Packing Suggestions

> **As a** user traveling,  
> **I want** packing suggestions based on my trip calendar,  
> **so that** I bring the right clothes.

### Acceptance Criteria

1. Detect multi-day trip events (e.g., "SF Trip 3/15-3/18")
2. Suggest outfits to pack for each day
3. Consider destination weather forecast
4. Packing list generated: "Pack 3 work outfits, 1 casual"
5. Checklist interface to mark items packed
6. Export packing list to notes/reminder app
