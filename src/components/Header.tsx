'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Archive, LogIn, LogOut, Zap } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/utils/supabase/client';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      if (user) {
        // Fetch username from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        setUsername(profile?.username || null);
      }

      setIsLoading(false);
    };

    checkUser();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);
      if (!session?.user) {
        setUsername(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Navigation Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/archive"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm font-medium group"
            >
              <Archive className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Archive</span>
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] transition-colors text-sm font-medium group"
            >
              <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>
          </nav>

          {/* Center: Game Title */}
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 group">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--accent-cyan)] group-hover:animate-pulse" />
              <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-space-mono)' }}>
                <span className="text-[var(--text-primary)]">ONE</span>
                <span className="text-[var(--accent-cyan)]">WORD</span>
                <span className="text-[var(--accent-pink)]">SEARCH</span>
              </h1>
            </div>
          </Link>

          {/* Right: User Actions */}
          <div className="flex items-center gap-4">
            {!isLoading && (
              isLoggedIn ? (
                <div className="flex items-center gap-3">
                  {username && (
                    <span className="text-[var(--text-secondary)] text-sm hidden sm:inline" style={{ fontFamily: 'var(--font-space-mono)' }}>
                      {username}
                    </span>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 bg-[var(--accent-pink)]/10 text-[var(--accent-pink)] px-3 py-1.5 rounded-lg hover:bg-[var(--accent-pink)]/20 font-medium transition-all text-sm border border-[var(--accent-pink)]/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] px-4 py-1.5 rounded-lg hover:bg-[var(--accent-cyan)]/20 font-medium transition-all text-sm border border-[var(--accent-cyan)]/30"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
