import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || username.length < 3) {
      return NextResponse.json({ available: false, error: 'Username too short' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if username exists in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which means username is available
      console.error('Error checking username:', error);
      return NextResponse.json({ available: false, error: 'Database error' }, { status: 500 });
    }

    // If data exists, username is taken. If no data, username is available
    const available = !data;

    return NextResponse.json({ available });
  } catch (error) {
    console.error('Error in check-username API:', error);
    return NextResponse.json({ available: false, error: 'Internal server error' }, { status: 500 });
  }
}
