# Security Fixing Implementation Plan

**Document Version:** 1.0
**Date:** 2026-02-08
**Audit Scope:** Vestiaire React Native + Expo + Supabase App
**Priority Legend:** P0 = Critical (block release), P1 = High (next sprint), P2 = Medium (upcoming)

---

## Table of Contents

1. [Phase 1 — Defense-in-Depth Query Filtering (P0)](#phase-1--defense-in-depth-query-filtering-p0)
2. [Phase 2 — Server-Side Enforcement (P0)](#phase-2--server-side-enforcement-p0)
3. [Phase 3 — Secure Token & Session Storage (P0)](#phase-3--secure-token--session-storage-p0)
4. [Phase 4 — API Key Protection (P0)](#phase-4--api-key-protection-p0)
5. [Phase 5 — Payment Processing (P0)](#phase-5--payment-processing-p0)
6. [Phase 6 — Gamification Integrity (P1)](#phase-6--gamification-integrity-p1)
7. [Phase 7 — RLS Policy Hardening (P1)](#phase-7--rls-policy-hardening-p1)
8. [Phase 8 — Production Logging Hygiene (P1)](#phase-8--production-logging-hygiene-p1)
9. [Phase 9 — Input Validation & Error Sanitization (P1)](#phase-9--input-validation--error-sanitization-p1)
10. [Phase 10 — Platform & Network Hardening (P2)](#phase-10--platform--network-hardening-p2)
11. [Migration & Rollback Strategy](#migration--rollback-strategy)
12. [Verification Checklist](#verification-checklist)

---

## Phase 1 — Defense-in-Depth Query Filtering (P0)

### Problem

Multiple service files query Supabase tables **without an explicit `.eq('user_id', userId)` filter**, relying entirely on Row Level Security. If RLS is ever disabled (debugging, migration error, policy misconfiguration), all user data is exposed.

### Affected Files & Exact Changes

#### 1.1 `apps/mobile/services/analyticsService.ts`

**Location:** `getWardrobeStats()` (~line 59-61)

```diff
+ const { data: { user } } = await supabase.auth.getUser();
+ if (!user) return { data: null, error: new Error('Not authenticated') };
+
  const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
+     .eq('user_id', user.id);
```

**Location:** `calculateSustainabilityScore()` (~line 293-296)

```diff
+ const { data: { user } } = await supabase.auth.getUser();
+ if (!user) return { score: 0, error: new Error('Not authenticated') };
+
  const { data: items } = await supabase
      .from('items')
      .select('id, wear_count, purchase_price')
-     .eq('status', 'complete');
+     .eq('status', 'complete')
+     .eq('user_id', user.id);
```

#### 1.2 `apps/mobile/services/gamificationService.ts`

**Location:** `getPointsHistory()` (~line 152-160)

```diff
+ const { data: { user } } = await supabase.auth.getUser();
+ if (!user) return { data: null, error: new Error('Not authenticated') };
+
  const { data, error } = await supabase
      .from('point_history')
      .select('*')
+     .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
```

**Location:** `checkBadgeCondition()` — `rainbow_warrior` case (~line 668-681)

```diff
  case 'rainbow_warrior': {
+     const { data: { user } } = await supabase.auth.getUser();
      const { data: allItems } = await supabase
          .from('items')
          .select('colors')
-         .eq('status', 'complete');
+         .eq('status', 'complete')
+         .eq('user_id', user!.id);
```

#### 1.3 `apps/mobile/services/listingService.ts`

**Location:** `getHistory()` (~line 229-238)

```diff
+ const { data: { user } } = await supabase.auth.getUser();
+ if (!user) return { data: null, error: new Error('Not authenticated') };
+
  let query = supabase
      .from('resale_listings')
      .select('*, item:items(*)')
+     .eq('user_id', user.id)
      .order('created_at', { ascending: false });
```

**Location:** `getResaleStats()` (~line 311-314)

```diff
+ const { data: { user } } = await supabase.auth.getUser();
+ if (!user) return { data: null, error: new Error('Not authenticated') };
+
  const { data, error } = await supabase
      .from('resale_listings')
-     .select('status, sold_price');
+     .select('status, sold_price')
+     .eq('user_id', user.id);
```

**Location:** `updateStatus()` (~line 251-298)

```diff
+ const { data: { user } } = await supabase.auth.getUser();
+ if (!user) return { error: new Error('Not authenticated') };
+
  const { error } = await supabase
      .from('resale_listings')
      .update(updates)
-     .eq('id', listingId);
+     .eq('id', listingId)
+     .eq('user_id', user.id);
```

#### 1.4 Helper: Create a Reusable `getCurrentUserId()` Utility

To avoid repeating the auth check in every function, create a shared helper:

**New file:** `apps/mobile/services/auth-helpers.ts`

```typescript
import { supabase } from './supabase';

/**
 * Returns the authenticated user's ID or throws if not authenticated.
 */
export async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}
```

Then refactor all services to use `const userId = await requireUserId();` instead of repeating the auth check.

### Acceptance Criteria

- [ ] Every `.from('items')`, `.from('point_history')`, `.from('resale_listings')` query includes `.eq('user_id', userId)`
- [ ] Every `.update()` and `.delete()` call includes both the record ID and `user_id`
- [ ] Grep for `.from(` across all services confirms no unfiltered queries remain

---

## Phase 2 — Server-Side Enforcement (P0)

### Problem

Premium status, usage limits, and challenge rewards are checked/enforced **only in client-side JavaScript**. A modified client or direct API call bypasses all restrictions.

### 2.1 Server-Side Premium Validation

**New migration:** `supabase/migrations/016_server_side_enforcement.sql`

```sql
-- Function: Check if user is premium (reusable in other functions)
CREATE OR REPLACE FUNCTION is_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_premium_until TIMESTAMPTZ;
  v_trial_expires TIMESTAMPTZ;
BEGIN
  SELECT premium_until INTO v_premium_until
  FROM profiles WHERE id = p_user_id;

  SELECT trial_expires_at INTO v_trial_expires
  FROM user_stats WHERE user_id = p_user_id;

  RETURN (
    (v_premium_until IS NOT NULL AND v_premium_until > NOW()) OR
    (v_trial_expires IS NOT NULL AND v_trial_expires > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.2 Atomic Usage Limit Check + Increment

```sql
-- Function: Check and increment AI suggestion usage (atomic)
CREATE OR REPLACE FUNCTION check_and_increment_ai_suggestions()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_is_premium BOOLEAN;
  v_limit INTEGER := 3; -- free tier daily limit
BEGIN
  v_is_premium := is_premium(v_user_id);

  -- Premium users: always allowed
  IF v_is_premium THEN
    RETURN json_build_object('allowed', true, 'remaining', -1);
  END IF;

  -- Get current usage, reset if new day
  SELECT ai_suggestions_today, ai_suggestions_reset_at
  INTO v_count, v_reset_at
  FROM user_stats WHERE user_id = v_user_id;

  -- Reset counter if past reset time
  IF v_reset_at IS NULL OR v_reset_at < NOW() THEN
    UPDATE user_stats
    SET ai_suggestions_today = 1,
        ai_suggestions_reset_at = (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
    WHERE user_id = v_user_id;
    RETURN json_build_object('allowed', true, 'remaining', v_limit - 1);
  END IF;

  -- Check limit
  IF v_count >= v_limit THEN
    RETURN json_build_object('allowed', false, 'remaining', 0,
      'reset_at', v_reset_at);
  END IF;

  -- Increment
  UPDATE user_stats
  SET ai_suggestions_today = ai_suggestions_today + 1
  WHERE user_id = v_user_id;

  RETURN json_build_object('allowed', true, 'remaining', v_limit - v_count - 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```sql
-- Function: Check and increment resale listing usage (atomic)
CREATE OR REPLACE FUNCTION check_and_increment_resale_listings()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_is_premium BOOLEAN;
  v_limit INTEGER := 2; -- free tier monthly limit
BEGIN
  v_is_premium := is_premium(v_user_id);

  IF v_is_premium THEN
    RETURN json_build_object('allowed', true, 'remaining', -1);
  END IF;

  SELECT resale_listings_month, resale_listings_reset_at
  INTO v_count, v_reset_at
  FROM user_stats WHERE user_id = v_user_id;

  IF v_reset_at IS NULL OR v_reset_at < NOW() THEN
    UPDATE user_stats
    SET resale_listings_month = 1,
        resale_listings_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMPTZ
    WHERE user_id = v_user_id;
    RETURN json_build_object('allowed', true, 'remaining', v_limit - 1);
  END IF;

  IF v_count >= v_limit THEN
    RETURN json_build_object('allowed', false, 'remaining', 0,
      'reset_at', v_reset_at);
  END IF;

  UPDATE user_stats
  SET resale_listings_month = resale_listings_month + 1
  WHERE user_id = v_user_id;

  RETURN json_build_object('allowed', true, 'remaining', v_limit - v_count - 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Server-Side Trial Grant

```sql
-- Function: Grant premium trial (one-time, atomic)
CREATE OR REPLACE FUNCTION grant_premium_trial_safe()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_already_granted BOOLEAN;
BEGIN
  SELECT trial_granted INTO v_already_granted
  FROM user_stats WHERE user_id = v_user_id;

  IF v_already_granted THEN
    RETURN json_build_object('granted', false, 'reason', 'Trial already used');
  END IF;

  UPDATE user_stats
  SET trial_granted = true,
      trial_started_at = NOW(),
      trial_expires_at = NOW() + INTERVAL '7 days'
  WHERE user_id = v_user_id AND NOT trial_granted;

  IF NOT FOUND THEN
    RETURN json_build_object('granted', false, 'reason', 'Trial already used');
  END IF;

  RETURN json_build_object('granted', true, 'expires_at', NOW() + INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.4 Server-Side Challenge Reward

```sql
-- Function: Award challenge rewards (validates completion)
CREATE OR REPLACE FUNCTION award_challenge_rewards_safe(p_challenge_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_challenge RECORD;
BEGIN
  SELECT * INTO v_challenge
  FROM user_challenges
  WHERE id = p_challenge_id
    AND user_id = v_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'Challenge not found or not active');
  END IF;

  -- Verify progress meets target
  IF v_challenge.current_progress < v_challenge.target THEN
    RETURN json_build_object('success', false, 'reason', 'Challenge not completed');
  END IF;

  -- Mark challenge as completed
  UPDATE user_challenges
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_challenge_id AND user_id = v_user_id;

  -- Grant 30 days premium
  UPDATE profiles
  SET premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + INTERVAL '30 days'
  WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.5 Client-Side Refactor

Update `usageLimitsService.ts` to call the server-side functions:

```typescript
// Replace client-side check with RPC call
checkAISuggestionLimit: async () => {
  const { data, error } = await supabase.rpc('check_and_increment_ai_suggestions');
  if (error) return { allowed: false, remaining: 0, error };
  return data;
},

checkResaleListingLimit: async () => {
  const { data, error } = await supabase.rpc('check_and_increment_resale_listings');
  if (error) return { allowed: false, remaining: 0, error };
  return data;
},
```

Update `subscriptionService.ts`:

```typescript
grantPremiumTrial: async () => {
  const { data, error } = await supabase.rpc('grant_premium_trial_safe');
  if (error) return { granted: false, error: error.message };
  return data;
},
```

Update `challengeService.ts`:

```typescript
awardChallengeRewards: async (challengeId: string) => {
  const { data, error } = await supabase.rpc('award_challenge_rewards_safe', {
    p_challenge_id: challengeId,
  });
  if (error) return { success: false, error: error.message };
  return data;
},
```

### Acceptance Criteria

- [ ] All four stored procedures created and tested
- [ ] Client services call `.rpc()` instead of direct `.update()` for premium/limits/trial/rewards
- [ ] Verified: modifying client code cannot bypass limits
- [ ] Verified: calling `.update()` directly on `profiles.premium_until` is blocked by RLS

---

## Phase 3 — Secure Token & Session Storage (P0)

### Problem

Supabase auth tokens (JWT access + refresh) are stored in plain-text `AsyncStorage`. Extractable on rooted/jailbroken devices.

### 3.1 Implement Encrypted Storage Adapter

**New file:** `apps/mobile/services/secureStorage.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800; // SecureStore limit is 2048 bytes, leave margin

/**
 * Encrypted storage adapter for Supabase auth.
 * Chunks large values across multiple SecureStore keys.
 */
export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunkCountStr) {
      // Try reading as single value (backward compat)
      return SecureStore.getItemAsync(key);
    }
    const chunkCount = parseInt(chunkCountStr, 10);
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (!chunk) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunks = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.substring(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}_chunks`, chunks.length.toString());
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
    }
  },

  async removeItem(key: string): Promise<void> {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountStr) {
      const chunkCount = parseInt(chunkCountStr, 10);
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};
```

### 3.2 Update Supabase Client

**File:** `apps/mobile/services/supabase.ts`

```diff
- import AsyncStorage from '@react-native-async-storage/async-storage';
+ import { secureStorageAdapter } from './secureStorage';

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
-         storage: AsyncStorage,
+         storage: secureStorageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
      },
  });
```

### 3.3 Migration Path for Existing Users

Add a one-time migration in `App.tsx` or a boot service to move tokens from AsyncStorage to SecureStore:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorageAdapter } from './services/secureStorage';

async function migrateSessionStorage() {
  const migrated = await AsyncStorage.getItem('session_migrated_v1');
  if (migrated) return;

  const sessionKey = 'sb-ynldmugsihrgwpvuvofu-auth-token';
  const oldSession = await AsyncStorage.getItem(sessionKey);
  if (oldSession) {
    await secureStorageAdapter.setItem(sessionKey, oldSession);
    await AsyncStorage.removeItem(sessionKey);
  }
  await AsyncStorage.setItem('session_migrated_v1', 'true');
}
```

### Acceptance Criteria

- [ ] Supabase client uses `secureStorageAdapter`
- [ ] Existing user sessions migrate transparently on first launch
- [ ] Tokens no longer visible via `AsyncStorage` dump
- [ ] App login/logout/refresh still works correctly

---

## Phase 4 — API Key Protection (P0)

### Problem

Gemini and Remove.bg API keys are embedded in the client binary via `EXPO_PUBLIC_*` env vars. Extractable by reverse engineering.

### 4.1 Create Supabase Edge Functions as Proxies

**New file:** `supabase/functions/ai-categorize/index.ts`

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

serve(async (req) => {
  // Verify authenticated user
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader! } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Rate limit check via RPC
  const { data: limitCheck } = await supabase.rpc('check_and_increment_ai_suggestions');
  if (!limitCheck?.allowed) {
    return new Response(JSON.stringify({ error: 'Limit reached', ...limitCheck }), { status: 429 });
  }

  // Forward to Gemini
  const body = await req.json();
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  const result = await geminiResponse.json();
  return new Response(JSON.stringify(result), { status: 200 });
});
```

**New file:** `supabase/functions/remove-bg/index.ts`

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const REMOVE_BG_API_KEY = Deno.env.get('REMOVE_BG_API_KEY')!;

serve(async (req) => {
  // Auth check (same pattern as above)
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader! } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Forward request to Remove.bg
  const formData = await req.formData();
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
    body: formData,
  });

  const blob = await response.blob();
  return new Response(blob, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'image/png' },
  });
});
```

### 4.2 Update Client Services

**File:** `apps/mobile/services/aiCategorization.ts`

```diff
- const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
- const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

+ // Call Gemini through Edge Function proxy
+ async function callGeminiProxy(prompt: string, imageBase64?: string) {
+   const { data, error } = await supabase.functions.invoke('ai-categorize', {
+     body: { prompt, image: imageBase64 },
+   });
+   if (error) throw error;
+   return data;
+ }
```

**File:** `apps/mobile/services/backgroundRemoval.ts`

```diff
- const REMOVE_BG_API_KEY = Constants.expoConfig?.extra?.removeBgApiKey || '';

+ async function callRemoveBgProxy(imageUrl: string) {
+   const formData = new FormData();
+   formData.append('image_url', imageUrl);
+   formData.append('size', 'auto');
+   const { data, error } = await supabase.functions.invoke('remove-bg', {
+     body: formData,
+   });
+   if (error) throw error;
+   return data;
+ }
```

### 4.3 Remove Client-Side API Keys

**File:** `apps/mobile/app.config.js`

```diff
  extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
-     removeBgApiKey: process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY,
-     geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  },
```

**File:** `.env.local` — remove `EXPO_PUBLIC_REMOVE_BG_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY`

Set these as Supabase secrets instead:

```bash
supabase secrets set GEMINI_API_KEY=AIzaSy...
supabase secrets set REMOVE_BG_API_KEY=3b1P1r...
```

### 4.4 Rotate All Exposed Keys

After deploying the Edge Functions:

1. Regenerate Gemini API key in Google AI Studio
2. Regenerate Remove.bg API key in Remove.bg dashboard
3. Update Supabase secrets with the new keys
4. Regenerate Supabase anon key if there's any concern about exposure

### Acceptance Criteria

- [ ] No `EXPO_PUBLIC_GEMINI_API_KEY` or `EXPO_PUBLIC_REMOVE_BG_API_KEY` in client bundle
- [ ] Edge Functions deployed and tested
- [ ] Old keys rotated and revoked
- [ ] Client services call Edge Functions via `supabase.functions.invoke()`
- [ ] Rate limiting enforced server-side within Edge Functions

---

## Phase 5 — Payment Processing (P0)

### Problem

Subscription purchases are simulated by directly writing `premium_until` to the database. No actual payment verification.

### 5.1 Integrate RevenueCat

**Install:**

```bash
npx expo install react-native-purchases
```

**New file:** `apps/mobile/services/revenueCatService.ts`

```typescript
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const RC_API_KEY_IOS = 'appl_XXXXXXX'; // from RevenueCat dashboard
const RC_API_KEY_ANDROID = 'goog_XXXXXXX';

export const revenueCatService = {
  initialize: async (userId: string) => {
    Purchases.configure({
      apiKey: Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID,
      appUserID: userId,
    });
  },

  getOfferings: async () => {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  },

  purchasePackage: async (pkg: PurchasesPackage) => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

    if (isPremium) {
      // Sync to Supabase via webhook (see 5.2), NOT client-side update
    }

    return { isPremium, customerInfo };
  },

  restorePurchases: async () => {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  },

  checkPremiumStatus: async () => {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  },
};
```

### 5.2 Server-Side Webhook for Purchase Verification

**New file:** `supabase/functions/revenuecat-webhook/index.ts`

RevenueCat sends webhooks when purchases are made/renewed/expired. The webhook handler updates `profiles.premium_until` server-side only:

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;

serve(async (req) => {
  // Verify webhook signature
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = await req.json();
  const userId = event.app_user_id;
  const expiresDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role for webhook
  );

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await supabase
        .from('profiles')
        .update({ premium_until: expiresDate })
        .eq('id', userId);
      break;

    case 'CANCELLATION':
    case 'EXPIRATION':
      await supabase
        .from('profiles')
        .update({ premium_until: null })
        .eq('id', userId);
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

### 5.3 Lock Down `profiles.premium_until` from Client Updates

**New migration:** Add to `016_server_side_enforcement.sql`

```sql
-- Prevent client from directly setting premium_until
CREATE OR REPLACE FUNCTION prevent_premium_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN
    -- Only allow if called by service_role (webhooks/edge functions)
    IF current_setting('role') != 'service_role' THEN
      NEW.premium_until := OLD.premium_until;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_premium_until
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_premium_update();
```

### Acceptance Criteria

- [ ] RevenueCat SDK integrated and configured
- [ ] Purchases go through App Store / Play Store
- [ ] `premium_until` is ONLY modified via webhook (service_role)
- [ ] Client cannot directly update `premium_until` (trigger blocks it)
- [ ] Restore purchases works correctly

---

## Phase 6 — Gamification Integrity (P1)

### Problem

`addPoints()` trusts client-provided `amount` and `actionType`. Badge checks don't always verify item ownership.

### 6.1 Server-Side Point Award Function

**Add to migration `016_server_side_enforcement.sql`:**

```sql
-- Valid point actions and their amounts
CREATE TABLE IF NOT EXISTS point_actions (
  action_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL
);

INSERT INTO point_actions (action_type, points) VALUES
  ('add_item', 10),
  ('log_wear', 5),
  ('create_outfit', 15),
  ('complete_challenge', 50),
  ('streak_milestone_7', 25),
  ('streak_milestone_30', 100)
ON CONFLICT DO NOTHING;

-- Function: Award points (validates action type and amount)
CREATE OR REPLACE FUNCTION award_points(p_action_type TEXT, p_context JSONB DEFAULT '{}')
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_points INTEGER;
BEGIN
  -- Look up valid points for action
  SELECT points INTO v_points
  FROM point_actions WHERE action_type = p_action_type;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'Invalid action type');
  END IF;

  -- Insert point history
  INSERT INTO point_history (user_id, points, action_type)
  VALUES (v_user_id, v_points, p_action_type);

  -- Update total
  UPDATE user_stats
  SET style_points = style_points + v_points
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'points', v_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 Update Client `gamificationService.ts`

```diff
  addPoints: async (amount: number, actionType: string) => {
-   // ... direct insert into point_history
-   // ... direct update of user_stats
+   const { data, error } = await supabase.rpc('award_points', {
+     p_action_type: actionType,
+   });
+   if (error) return { data: null, error };
+   return { data, error: null };
  },
```

### 6.3 Fix Badge Ownership Verification

In `gamificationService.ts`, ensure every badge condition query includes `user_id`:

```diff
  case 'rainbow_warrior': {
+     const userId = await requireUserId();
      const { data: allItems } = await supabase
          .from('items')
          .select('colors')
          .eq('status', 'complete')
+         .eq('user_id', userId);
```

Apply the same pattern to all badge condition cases.

### Acceptance Criteria

- [ ] `addPoints()` calls `award_points` RPC — client cannot specify arbitrary amounts
- [ ] Point actions table defines the only valid (action, amount) pairs
- [ ] All badge condition queries filter by `user_id`

---

## Phase 7 — RLS Policy Hardening (P1)

### Problem

Several tables are missing DELETE policies, and migrations 014-015 added columns but no new RLS policies for the new data.

### 7.1 New Migration: `017_rls_hardening.sql`

```sql
-- Add missing DELETE policies

-- user_badges: users can only delete their own badges (for unfeaturing)
CREATE POLICY "Users can delete own badges"
  ON user_badges FOR DELETE
  USING (auth.uid() = user_id);

-- resale_listings: users can delete own draft listings
CREATE POLICY "Users can delete own listings"
  ON resale_listings FOR DELETE
  USING (auth.uid() = user_id);

-- user_challenges: users can delete own challenges
CREATE POLICY "Users can delete own challenges"
  ON user_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- point_history: prevent deletion (audit trail)
-- No DELETE policy = deletion blocked by RLS

-- user_stats: prevent deletion
-- No DELETE policy = deletion blocked by RLS

-- Tighten user_stats INSERT (only one row per user, via trigger)
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = auth.uid())
  );

-- Prevent direct UPDATE of sensitive user_stats fields from client
-- (points, trial_granted, etc. should only change via stored procedures)
CREATE POLICY "Users can update non-sensitive stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Prevent direct manipulation of points and trial
    AND style_points = (SELECT style_points FROM user_stats WHERE user_id = auth.uid())
    AND trial_granted = (SELECT trial_granted FROM user_stats WHERE user_id = auth.uid())
  );
```

### Acceptance Criteria

- [ ] Every table has explicit SELECT, INSERT, UPDATE, DELETE policies (or intentionally omitted to block)
- [ ] `user_stats` sensitive fields can only be modified by stored procedures (`SECURITY DEFINER`)
- [ ] Tested: client cannot directly increment `style_points` or set `trial_granted`

---

## Phase 8 — Production Logging Hygiene (P1)

### Problem

134+ `console.log`/`console.error` statements across all services leak data in production builds.

### 8.1 Create a Logger Utility

**New file:** `apps/mobile/services/logger.ts`

```typescript
const isDev = __DEV__;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors, but sanitize in production
    if (isDev) {
      console.error('[ERROR]', ...args);
    } else {
      // In production: log to crash reporting service (Sentry, Crashlytics)
      // WITHOUT including sensitive data
      const sanitized = args.map((arg) =>
        arg instanceof Error ? arg.message : '[redacted]'
      );
      console.error('[ERROR]', ...sanitized);
    }
  },
};
```

### 8.2 Find-and-Replace All Console Statements

Run a systematic replacement across all service and component files:

```bash
# Files to update (excluding node_modules):
apps/mobile/services/*.ts
apps/mobile/stores/*.ts
apps/mobile/components/**/*.tsx
apps/mobile/app/**/*.tsx
apps/mobile/hooks/*.ts
```

**Replace pattern:**

```diff
- console.log('Upload success, URL:', urlData.publicUrl);
+ logger.debug('Upload success');

- console.error('Failed to load items:', error);
+ logger.error('Failed to load items:', error);

- console.log('Auth state changed:', event);
+ logger.debug('Auth state changed:', event);
```

**Rules:**
- Never log URLs, tokens, API keys, user data, or full API responses
- Replace `console.log` with `logger.debug` or `logger.info`
- Replace `console.error` with `logger.error`
- Remove or redact any PII (emails, names, item details) from log messages

### Acceptance Criteria

- [ ] Zero `console.log` or `console.error` statements in services/components (only `logger.*`)
- [ ] Production builds show no sensitive data in device logs
- [ ] `logger.debug`/`logger.info` are silent in production (`__DEV__ === false`)

---

## Phase 9 — Input Validation & Error Sanitization (P1)

### 9.1 AI Response Validation with Schema

**Install:** `zod` (lightweight schema validation)

```bash
cd apps/mobile && npx expo install zod
```

**File:** `apps/mobile/services/listingService.ts`

```diff
+ import { z } from 'zod';

+ const ListingDataSchema = z.object({
+   title: z.string().min(1).max(100),
+   description: z.string().min(1).max(5000),
+   suggested_price_range: z.string().max(50),
+   hashtags: z.array(z.string().max(50)).max(15),
+   condition_notes: z.string().max(500).optional(),
+ });

  // In generateListing():
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
- const parsed = JSON.parse(jsonMatch[0]) as ListingData;
- if (!parsed.title || !parsed.description) {
-   throw new Error('AI response missing required fields');
- }
+ const parsed = ListingDataSchema.parse(JSON.parse(jsonMatch[0]));
```

### 9.2 Sanitize Error Messages Shown to Users

**File:** Create `apps/mobile/services/errorMessages.ts`

```typescript
/**
 * Map internal errors to user-friendly messages.
 * Never show raw database/API error messages to users.
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not authenticated') || msg.includes('jwt'))
      return 'Please sign in again to continue.';
    if (msg.includes('network') || msg.includes('fetch'))
      return 'Connection issue. Please check your internet and try again.';
    if (msg.includes('rate limit') || msg.includes('too many'))
      return 'Too many requests. Please wait a moment and try again.';
    if (msg.includes('not found'))
      return 'The requested item could not be found.';
  }
  return 'Something went wrong. Please try again.';
}
```

Update all user-facing error displays:

```diff
- setError(error.message);
+ setError(getUserFriendlyError(error));
```

### 9.3 Remove Email from URL Navigation Params

**File:** `apps/mobile/app/(auth)/sign-up.tsx`

```diff
+ import * as SecureStore from 'expo-secure-store';

  // After successful signup:
- router.push({
-   pathname: '/(auth)/verify-email',
-   params: { email },
- });
+ await SecureStore.setItemAsync('pending_verification_email', email);
+ router.push('/(auth)/verify-email');
```

**File:** `apps/mobile/app/(auth)/verify-email.tsx`

```diff
+ import * as SecureStore from 'expo-secure-store';

- const { email } = useLocalSearchParams<{ email: string }>();
+ const [email, setEmail] = useState('');
+ useEffect(() => {
+   SecureStore.getItemAsync('pending_verification_email').then((e) => {
+     if (e) setEmail(e);
+   });
+ }, []);
```

### Acceptance Criteria

- [ ] All AI responses validated with Zod schemas before use
- [ ] No raw `error.message` displayed to users
- [ ] Email no longer passed as navigation param

---

## Phase 10 — Platform & Network Hardening (P2)

### 10.1 Update Android Permissions

**File:** `apps/mobile/app.config.js`

```diff
  permissions: [
      'android.permission.CAMERA',
-     'android.permission.READ_EXTERNAL_STORAGE',
-     'android.permission.WRITE_EXTERNAL_STORAGE',
+     'android.permission.READ_MEDIA_IMAGES',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
  ],
```

### 10.2 Certificate Pinning (Optional but Recommended)

For critical API endpoints, consider adding SSL pinning. This is complex with Expo managed workflow, so evaluate if ejecting or using EAS custom native modules is feasible:

```typescript
// If using bare workflow or custom dev client:
// Install: react-native-ssl-pinning
// Pin Supabase and Google API certificates
```

**Alternative for managed Expo workflow:** Rely on platform-level certificate trust store and monitor for MITM via response integrity checks.

### 10.3 Google Calendar Token Refresh

**File:** `apps/mobile/services/calendar.ts`

```diff
+ async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
+   const response = await fetch('https://oauth2.googleapis.com/token', {
+     method: 'POST',
+     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+     body: new URLSearchParams({
+       client_id: GOOGLE_WEB_CLIENT_ID,
+       refresh_token: refreshToken,
+       grant_type: 'refresh_token',
+     }).toString(),
+   });
+   if (!response.ok) return null;
+   const data = await response.json();
+   return {
+     accessToken: data.access_token,
+     refreshToken: refreshToken,
+     expiresAt: Date.now() + data.expires_in * 1000,
+   };
+ }

  // Before every API call, check and refresh:
+ async function getValidAccessToken(): Promise<string | null> {
+   const tokens = await getStoredTokens();
+   if (!tokens) return null;
+   if (tokens.expiresAt && tokens.expiresAt > Date.now() + 60000) {
+     return tokens.accessToken;
+   }
+   const refreshed = await refreshAccessToken(tokens.refreshToken);
+   if (!refreshed) return null;
+   await storeTokens(refreshed);
+   return refreshed.accessToken;
+ }
```

### Acceptance Criteria

- [ ] Android permissions use scoped storage APIs
- [ ] Google Calendar tokens auto-refresh before expiry
- [ ] Certificate pinning evaluated and documented (implement if feasible)

---

## Migration & Rollback Strategy

### Migration Order

| Step | Description | File | Reversible |
|------|-------------|------|------------|
| 1 | Deploy server-side enforcement functions | `016_server_side_enforcement.sql` | Yes (drop functions) |
| 2 | Deploy RLS hardening | `017_rls_hardening.sql` | Yes (drop policies) |
| 3 | Deploy Edge Functions | `supabase/functions/*` | Yes (delete functions) |
| 4 | Set Supabase secrets | CLI | Yes (reset secrets) |
| 5 | Deploy client update | App binary | Yes (revert via OTA/EAS Update) |
| 6 | Rotate API keys | External dashboards | No (one-way) |

### Rollback Procedures

- **Database functions:** `DROP FUNCTION function_name;`
- **RLS policies:** `DROP POLICY policy_name ON table_name;`
- **Edge Functions:** `supabase functions delete function-name`
- **Client:** Push revert via EAS Update (OTA)
- **API keys:** Cannot un-rotate; keep old keys documented temporarily

### Testing Strategy

1. **Unit test** each stored procedure with test users
2. **Integration test** Edge Functions with curl/Postman
3. **E2E test** full flows: signup, add item, generate outfit, create listing, purchase premium
4. **Penetration test** after deployment:
   - Try accessing other user's data via direct Supabase API
   - Try bypassing usage limits via modified client
   - Try setting `premium_until` directly
   - Try awarding arbitrary points

---

## Verification Checklist

### Phase 1 — Query Filtering
- [ ] `analyticsService.ts` — all queries include `user_id`
- [ ] `gamificationService.ts` — all queries include `user_id`
- [ ] `listingService.ts` — all queries include `user_id`
- [ ] `auth-helpers.ts` created with `requireUserId()`
- [ ] Full grep confirms no unfiltered `.from(` calls

### Phase 2 — Server-Side Enforcement
- [ ] `check_and_increment_ai_suggestions` RPC tested
- [ ] `check_and_increment_resale_listings` RPC tested
- [ ] `grant_premium_trial_safe` RPC tested
- [ ] `award_challenge_rewards_safe` RPC tested
- [ ] Client services updated to use `.rpc()` calls

### Phase 3 — Secure Storage
- [ ] `secureStorageAdapter` implemented and tested
- [ ] Supabase client uses secure adapter
- [ ] Session migration works for existing users
- [ ] Login/logout/refresh flows verified

### Phase 4 — API Key Protection
- [ ] Edge Functions deployed for Gemini and Remove.bg
- [ ] Client no longer contains third-party API keys
- [ ] Old keys rotated
- [ ] Edge Functions enforce auth and rate limits

### Phase 5 — Payment Processing
- [ ] RevenueCat SDK integrated
- [ ] Webhook handler deployed
- [ ] `premium_until` protected by trigger
- [ ] Purchase and restore flows tested on both platforms

### Phase 6 — Gamification Integrity
- [ ] `award_points` RPC replaces client-side `addPoints()`
- [ ] `point_actions` table defines valid actions
- [ ] All badge conditions filter by `user_id`

### Phase 7 — RLS Hardening
- [ ] DELETE policies added where needed
- [ ] `user_stats` INSERT limited to one row per user
- [ ] Sensitive fields protected from direct client UPDATE

### Phase 8 — Logging
- [ ] `logger.ts` utility created
- [ ] All `console.log`/`console.error` replaced
- [ ] Production builds show no sensitive data

### Phase 9 — Validation
- [ ] Zod schemas validate AI responses
- [ ] Error messages sanitized for users
- [ ] Email removed from navigation params

### Phase 10 — Platform Hardening
- [ ] Android permissions updated to scoped storage
- [ ] Google Calendar token refresh implemented
- [ ] Certificate pinning evaluated
