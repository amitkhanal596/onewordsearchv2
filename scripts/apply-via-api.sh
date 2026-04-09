#!/bin/bash

# Migration Script: Apply via Supabase API
# This script attempts to execute the migration using various API methods

set -e

echo "=== Applying game_results Migration via API ==="
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: Missing environment variables"
    exit 1
fi

echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Read migration file
MIGRATION_SQL=$(cat supabase/migrations/003_game_results.sql)

echo "Attempting to execute migration..."
echo ""

# Try Method 1: Using Supabase Management API (requires project API key)
echo "Method 1: Attempting via Supabase Management API..."

# Extract project ref
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | cut -d'.' -f1)
echo "Project Reference: $PROJECT_REF"
echo ""

# Note: This requires SUPABASE_ACCESS_TOKEN (personal access token from Supabase dashboard)
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    RESPONSE=$(curl -s -X POST \
        "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

    echo "Response: $RESPONSE"
else
    echo "⚠ SUPABASE_ACCESS_TOKEN not found - skipping Management API method"
fi

echo ""
echo "=== Manual Migration Instructions ==="
echo ""
echo "Since automated SQL execution is restricted for security,"
echo "please apply the migration manually:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy the contents of: supabase/migrations/003_game_results.sql"
echo "3. Paste into the SQL editor"
echo "4. Click 'Run' or press Cmd/Ctrl + Enter"
echo ""
