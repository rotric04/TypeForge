-- TypeForge AI — Migration Cleanup: Remove overly permissive RLS policies
-- Run this in Supabase SQL Editor to fix security linter warnings.

-- Drop the overly permissive authenticated-role policies (safe to drop these)
DROP POLICY IF EXISTS "Sessions service role full access" ON public.sessions;
DROP POLICY IF EXISTS "Keystrokes service role full access" ON public.keystrokes;
DROP POLICY IF EXISTS "Achievements service role full access" ON public.achievements;
DROP POLICY IF EXISTS "Typing DNA service role full access" ON public.typing_dna;
DROP POLICY IF EXISTS "Users backend write access" ON public.users;

-- Fix rls_auto_enable() warning: revoke execute from public roles instead of dropping
-- (Cannot drop it — Supabase event trigger depends on it internally)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- Verify remaining policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
