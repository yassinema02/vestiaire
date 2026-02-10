# Epic 3: 🌤️ Context Integration

**Goal:** Connect external data sources (weather and calendar) to provide contextual awareness for outfit recommendations.

---

## Story 3.1: User Location & Weather Display

> **As a** user,  
> **I want** to see current weather conditions for my location,  
> **so that** I can understand why certain outfits are recommended.

### Acceptance Criteria

1. App requests location permission on first use with clear explanation
2. Current location used to fetch weather data
3. Weather widget on Home screen shows: temperature, condition icon, "feels like"
4. Weather updates automatically when app opens (cached for 30 minutes)
5. Manual location override option in settings
6. Graceful fallback if location denied (manual city entry)
7. Integration with OpenWeatherMap or Open-Meteo API

---

## Story 3.2: Weather Forecast for Planning

> **As a** user,  
> **I want** to see weather forecast for the next few days,  
> **so that** I can plan outfits ahead of time.

### Acceptance Criteria

1. 5-day forecast displayed in collapsible section on Home
2. Each day shows: high/low temp, condition icon, precipitation chance
3. Tap on future day to get outfit suggestion for that day's weather
4. Forecast data cached and refreshed every 3 hours
5. Weather-to-clothing mapping defined (e.g., <10°C → suggest outerwear)

---

## Story 3.3: Google Calendar Integration

> **As a** user,  
> **I want** to connect my Google Calendar,  
> **so that** outfit suggestions consider my upcoming events.

### Acceptance Criteria

1. "Connect Google Calendar" option in settings
2. OAuth flow for Google Calendar read-only access
3. Today's events displayed on Home screen
4. Event titles and times shown (not full details for privacy)
5. Events tagged with detected occasion type (work, social, formal)
6. Option to disconnect calendar at any time
7. Calendar data refreshed on app open

---

## Story 3.4: Apple Calendar (EventKit) Integration

> **As a** user,  
> **I want** to use my iPhone's built-in calendar,  
> **so that** I don't need to connect external services.

### Acceptance Criteria

1. "Use iPhone Calendar" option in settings
2. EventKit permission requested with explanation
3. Today's events from all calendars displayed on Home
4. User can select which calendars to include
5. Same display format as Google Calendar events
6. Works alongside or instead of Google Calendar

---

## Story 3.5: Context Summary for AI

> **As a** system,  
> **I want** to compile weather and calendar data into a context object,  
> **so that** the AI can generate relevant outfit suggestions.

### Acceptance Criteria

1. Context object structure defined: `{ weather, events, date, dayOfWeek }`
2. Weather mapped to clothing needs (cold → layers, rain → waterproof)
3. Events mapped to occasion types (meeting → work, dinner → smart casual)
4. Context object available to AI prompt in Epic 4
5. Context stored temporarily for current session
6. Edge cases handled: no events, no weather, multiple events
