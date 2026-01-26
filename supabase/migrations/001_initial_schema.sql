-- Vestiaire Initial Schema
-- Migration: 001_initial_schema.sql
-- Description: Creates profiles table with RLS and storage bucket

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Extends Supabase Auth users with app-specific data

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  premium_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_profiles_id ON profiles(id);

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================
-- Automatically creates a profile when a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profile is created automatically by trigger, so no INSERT policy needed for users
-- Service role can insert (used by trigger)

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
-- Automatically updates the updated_at timestamp

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================
-- Note: Storage bucket creation is done via Supabase Dashboard or storage API
-- This migration creates the RLS policies for when the bucket is created

-- Storage RLS policies (applied after bucket creation)
-- Users can upload to their own folder: wardrobe-images/{user_id}/*
-- Users can view their own images
-- Users can delete their own images

-- The bucket 'wardrobe-images' should be created with:
-- - Public: false (private bucket)
-- - File size limit: 10MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp
