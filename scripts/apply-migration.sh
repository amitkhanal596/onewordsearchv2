#!/bin/bash

# Migration Application Script
# Provides clear instructions and opens Supabase Studio

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          Game Results Table Migration Application                  ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
    exit 1
fi

# Extract project ref
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | cut -d'.' -f1)

echo "📋 Migration Details:"
echo "   File: supabase/migrations/003_game_results.sql"
echo "   Project: $PROJECT_REF"
echo ""

# Check if migration file exists
if [ ! -f "supabase/migrations/003_game_results.sql" ]; then
    echo "❌ Error: Migration file not found"
    exit 1
fi

echo "✅ Migration file found"
echo ""

# Copy migration SQL to clipboard if possible
if command -v pbcopy &> /dev/null; then
    cat supabase/migrations/003_game_results.sql | pbcopy
    echo "✅ Migration SQL copied to clipboard!"
    echo ""
elif command -v xclip &> /dev/null; then
    cat supabase/migrations/003_game_results.sql | xclip -selection clipboard
    echo "✅ Migration SQL copied to clipboard!"
    echo ""
fi

echo "📖 Instructions to Apply Migration:"
echo ""
echo "   1. Opening Supabase SQL Editor..."
echo ""

# Open Supabase Studio SQL editor
SQL_EDITOR_URL="https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

if command -v open &> /dev/null; then
    open "$SQL_EDITOR_URL"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$SQL_EDITOR_URL"
else
    echo "   URL: $SQL_EDITOR_URL"
fi

echo "   2. In the SQL Editor:"
if command -v pbcopy &> /dev/null || command -v xclip &> /dev/null; then
    echo "      - Paste the SQL (Cmd/Ctrl + V) - it's already in your clipboard!"
else
    echo "      - Copy the SQL from: supabase/migrations/003_game_results.sql"
    echo "      - Paste it into the editor"
fi
echo "      - Click 'RUN' or press Cmd/Ctrl + Enter"
echo ""
echo "   3. Verify success:"
echo "      - You should see: 'Success. No rows returned'"
echo "      - Run verification: npm run verify-migration"
echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo ""

# Display the SQL for reference
echo "📄 Migration SQL Preview:"
echo ""
echo "   Creating table: game_results"
echo "   - Columns: id, user_id, puzzle_id, session_id, completion_time_seconds, stars"
echo "   - Indexes: 4 (user_id, puzzle_id, completed_at, composite)"
echo "   - RLS Policies: 2 (SELECT, INSERT)"
echo "   - Constraints: Foreign keys, checks, unique session_id"
echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo ""
echo "💡 Alternative: If you prefer command-line:"
echo ""
echo "   Install Supabase CLI:"
echo "     npm install -g supabase"
echo ""
echo "   Then run:"
echo "     supabase link --project-ref $PROJECT_REF"
echo "     supabase db push"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""
