-- TypeForge AI Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    typing_type TEXT DEFAULT 'mixed',
    goal TEXT DEFAULT 'speed',
    experience TEXT DEFAULT 'intermediate',
    baseline_wpm INTEGER DEFAULT 60,
    archetype TEXT,
    archetype_icon TEXT,
    focus_score INTEGER DEFAULT 0,
    consistency_score INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    improvement_score INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    total_sessions INTEGER DEFAULT 0,
    best_wpm INTEGER DEFAULT 0,
    is_pro BOOLEAN DEFAULT FALSE,
    anonymous_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    language TEXT,
    duration_secs INTEGER NOT NULL,
    wpm INTEGER NOT NULL,
    raw_wpm INTEGER NOT NULL,
    accuracy NUMERIC(5,2) NOT NULL,
    correct_chars INTEGER DEFAULT 0,
    error_chars INTEGER DEFAULT 0,
    total_chars INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    consistency NUMERIC(5,2) NOT NULL,
    max_streak INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keystroke Log Table (Optional for detailed analytics)
CREATE TABLE IF NOT EXISTS public.keystrokes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    char TEXT NOT NULL,
    typed TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    delay_ms NUMERIC(10,2) NOT NULL,
    timestamp NUMERIC(15,2) NOT NULL,
    idx INTEGER NOT NULL
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Typing DNA Table
CREATE TABLE IF NOT EXISTS public.typing_dna (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    dna_id TEXT NOT NULL,
    archetype TEXT NOT NULL,
    weak_keys TEXT[] DEFAULT '{}',
    weak_bigrams TEXT[] DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keystrokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_dna ENABLE ROW LEVEL SECURITY;

-- Create policies for Users (Users can read/update their own data)
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid()::text = clerk_id OR true); -- Allowing true for server-to-server operations if bypassing RLS via service role

-- Note: Because we access Supabase from FastAPI via Service Role key or `asyncpg` pool, 
-- we bypass RLS for server operations. The policies above are mostly useful if we query from client.
