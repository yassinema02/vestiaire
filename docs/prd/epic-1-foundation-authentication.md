# Epic 1: 🏗️ Foundation & Authentication

**Goal:** Establish the complete development infrastructure for Vestiaire including Expo project setup, Supabase backend configuration, CI/CD pipeline to TestFlight, and secure user authentication.

---

## Story 1.1: Project Initialization & Development Environment

> **As a** developer,  
> **I want** a properly configured Expo project with TypeScript, linting, and folder structure,  
> **so that** I can begin development with best practices from day one.

### Acceptance Criteria

1. Expo project created with `npx create-expo-app` using TypeScript template
2. Folder structure follows monorepo pattern (`apps/mobile`, `packages/shared`)
3. ESLint + Prettier configured with React Native rules
4. Git repository initialized with `.gitignore` for React Native/Expo
5. README.md documents setup instructions and project structure
6. App runs successfully in Expo Go on iOS simulator

---

## Story 1.2: Supabase Backend Setup

> **As a** developer,  
> **I want** a configured Supabase project with database schema and storage buckets,  
> **so that** the app has a production-ready backend from the start.

### Acceptance Criteria

1. Supabase project created with appropriate region (EU for GDPR)
2. Initial database schema created for `users`, `profiles` tables
3. Row Level Security (RLS) policies enabled for user data
4. Storage bucket `wardrobe-images` created with private access
5. Supabase client configured in React Native app with environment variables
6. Connection verified: app can read from database

---

## Story 1.3: CI/CD Pipeline to TestFlight

> **As a** developer,  
> **I want** automated builds that deploy to TestFlight on every main branch push,  
> **so that** testers always have access to the latest version.

### Acceptance Criteria

1. EAS Build configured for iOS with valid provisioning profile
2. GitHub Actions workflow triggers on push to `main` branch
3. Workflow runs EAS Build and submits to TestFlight automatically
4. Build secrets (Apple credentials, Supabase keys) stored securely in GitHub
5. Successful test: push to main → build appears in TestFlight within 30 minutes
6. Build versioning increments automatically

---

## Story 1.4: Email/Password Authentication

> **As a** user,  
> **I want** to create an account with my email and password,  
> **so that** I can securely access my personal wardrobe.

### Acceptance Criteria

1. Sign-up screen with email, password, confirm password fields
2. Password validation: minimum 8 characters, 1 uppercase, 1 number
3. Email verification required before full access
4. Sign-in screen with email/password fields
5. "Forgot password" flow sends reset email
6. Session persists across app restarts (secure token storage)
7. Error states displayed for invalid credentials, network errors

---

## Story 1.5: Apple Sign-In Integration

> **As a** user,  
> **I want** to sign in with my Apple ID,  
> **so that** I can quickly access the app without creating a new password.

### Acceptance Criteria

1. "Sign in with Apple" button displayed on auth screens
2. Apple Sign-In flow completes successfully on iOS device
3. User profile created in Supabase with Apple-provided info
4. Existing users can link Apple ID to their account
5. Works on both TestFlight and Expo Go (development)
6. Complies with Apple's Human Interface Guidelines

---

## Story 1.6: App Shell & Navigation Structure

> **As a** user,  
> **I want** a clear navigation structure with tab bar and screens,  
> **so that** I can intuitively navigate the app.

### Acceptance Criteria

1. Bottom tab navigation with icons: Home, Wardrobe, Add, Outfits, Profile
2. Each tab renders a placeholder screen with title
3. Stack navigation within each tab for sub-screens
4. Auth flow: unauthenticated users see only auth screens
5. Tab bar hidden during authentication flow
6. Smooth transitions and animations between screens
7. App icon and splash screen configured with Vestiaire branding
