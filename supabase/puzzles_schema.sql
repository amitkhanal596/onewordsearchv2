-- =====================================================
-- PUZZLE SERVICE DATABASE SCHEMA
-- =====================================================
-- This schema sets up the puzzles table for the stateless Puzzle Service.
-- This service is read-only and cacheable.
--
-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Create puzzles table
-- This table stores all puzzle data independently of user state
CREATE TABLE IF NOT EXISTS public.puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_number INTEGER UNIQUE NOT NULL,
    puzzle_date DATE UNIQUE NOT NULL,
    board JSONB NOT NULL, -- 2D array of letters
    words JSONB NOT NULL, -- Array of words to find
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT,
    metadata JSONB DEFAULT '{}', -- Additional puzzle metadata (theme, source, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_puzzles_number ON public.puzzles(puzzle_number);
CREATE INDEX IF NOT EXISTS idx_puzzles_date ON public.puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON public.puzzles(difficulty);
CREATE INDEX IF NOT EXISTS idx_puzzles_created_at ON public.puzzles(created_at);

-- Enable Row Level Security
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Puzzles are read-only for all users (no authentication required)

-- Policy: Everyone can view all puzzles (read-only service)
CREATE POLICY "Puzzles are viewable by everyone"
    ON public.puzzles
    FOR SELECT
    USING (true);

-- Policy: Only service accounts can insert puzzles (admin operation)
-- This prevents unauthorized puzzle creation
CREATE POLICY "Only authenticated users can insert puzzles"
    ON public.puzzles
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only service accounts can update puzzles (admin operation)
CREATE POLICY "Only authenticated users can update puzzles"
    ON public.puzzles
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only service accounts can delete puzzles (admin operation)
CREATE POLICY "Only authenticated users can delete puzzles"
    ON public.puzzles
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_puzzle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_puzzle_updated ON public.puzzles;

-- Create trigger to update timestamp on puzzle updates
CREATE TRIGGER on_puzzle_updated
    BEFORE UPDATE ON public.puzzles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_puzzle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant read access to anonymous and authenticated users
-- This enables the stateless, cacheable service

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.puzzles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.puzzles TO authenticated;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Insert some sample puzzles for testing purposes
-- Remove this section in production or after initial setup

INSERT INTO public.puzzles (puzzle_number, puzzle_date, board, words, difficulty, category, metadata)
VALUES
(
    1,
    '2024-02-21',
    '[["C","A","T"],["D","O","G"],["B","I","R"]]'::jsonb,
    '["CAT","DOG","BIRD"]'::jsonb,
    'easy',
    'animals',
    '{"theme": "pets", "source": "onewordsearch.com"}'::jsonb
),
(
    2,
    '2024-02-22',
    '[["S","U","N"],["M","O","O"],["N","S","T"]]'::jsonb,
    '["SUN","MOON","STAR"]'::jsonb,
    'easy',
    'astronomy',
    '{"theme": "space", "source": "onewordsearch.com"}'::jsonb
),
(
    3,
    '2024-02-23',
    '[["A","P","P"],["L","E","P"],["I","E","S"]]'::jsonb,
    '["APPLE","PIE","APPLES"]'::jsonb,
    'medium',
    'food',
    '{"theme": "desserts", "source": "onewordsearch.com"}'::jsonb
)
ON CONFLICT (puzzle_number) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.puzzles IS 'Stores all puzzle data for the stateless Puzzle Service. This table is read-only from the API perspective.';
COMMENT ON COLUMN public.puzzles.id IS 'Unique identifier for the puzzle (UUID)';
COMMENT ON COLUMN public.puzzles.puzzle_number IS 'Sequential puzzle number (unique)';
COMMENT ON COLUMN public.puzzles.puzzle_date IS 'Date the puzzle was published (unique)';
COMMENT ON COLUMN public.puzzles.board IS 'The puzzle board as a 2D array of letters (JSONB)';
COMMENT ON COLUMN public.puzzles.words IS 'Array of words to find in the puzzle (JSONB)';
COMMENT ON COLUMN public.puzzles.difficulty IS 'Difficulty level: easy, medium, or hard';
COMMENT ON COLUMN public.puzzles.category IS 'Category or theme of the puzzle';
COMMENT ON COLUMN public.puzzles.metadata IS 'Additional puzzle metadata (theme, source, etc.)';
