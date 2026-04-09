'use client';

import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@/types/leaderboard';
import { Trophy, Star, Clock, Hash, Info, Crown, Medal, Award } from 'lucide-react';

export default function LeaderboardTable() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/leaderboard?limit=100');

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();
        setLeaderboard(data.leaderboard);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-[var(--accent-yellow)]" />
          <span className="text-xl font-bold text-[var(--accent-yellow)]" style={{ fontFamily: 'var(--font-space-mono)' }}>1</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-gray-400" />
          <span className="text-lg font-bold text-gray-400" style={{ fontFamily: 'var(--font-space-mono)' }}>2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <span className="text-lg font-bold text-amber-600" style={{ fontFamily: 'var(--font-space-mono)' }}>3</span>
        </div>
      );
    }
    return (
      <span className="text-[var(--text-secondary)] font-bold" style={{ fontFamily: 'var(--font-space-mono)' }}>
        {rank}
      </span>
    );
  };

  const getRowStyle = (rank: number): string => {
    if (rank === 1) return 'border-l-4 border-l-[var(--accent-yellow)] bg-[var(--accent-yellow)]/5';
    if (rank === 2) return 'border-l-4 border-l-gray-400 bg-gray-400/5';
    if (rank === 3) return 'border-l-4 border-l-amber-600 bg-amber-600/5';
    return 'border-l-4 border-l-transparent';
  };

  if (isLoading) {
    return (
      <div className="card-glow p-12 text-center animate-fade-in">
        <div className="w-12 h-12 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-[var(--text-muted)]">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow p-12 text-center">
        <p className="text-[var(--accent-pink)]">{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="card-glow p-12 text-center">
        <Trophy className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)] text-lg">No qualified players yet!</p>
        <p className="text-[var(--text-muted)] text-sm mt-2">Complete 30 puzzles to appear on the leaderboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[var(--text-muted)] text-xs uppercase tracking-wider">
        <div className="col-span-1">Rank</div>
        <div className="col-span-4">Player</div>
        <div className="col-span-3 text-center flex items-center justify-center gap-1">
          <Star className="w-3 h-3" />
          <span>Score</span>
          <div className="relative group">
            <Info className="w-3 h-3 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block pointer-events-none z-50">
              <div className="card-glow px-3 py-2 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                avg_stars × ln(total_games)
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-2 text-center">Games</div>
        <div className="col-span-2 text-center">Best</div>
      </div>

      {/* Player Rows */}
      {leaderboard.map((entry, index) => (
        <div
          key={entry.user_id}
          className={`
            card-glow grid grid-cols-12 gap-4 px-4 py-4 items-center
            ${getRowStyle(entry.rank)}
            transition-all duration-200 hover:scale-[1.01]
          `}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {/* Rank */}
          <div className="col-span-1">
            {getRankDisplay(entry.rank)}
          </div>

          {/* Username */}
          <div className="col-span-4">
            <span
              className={`font-medium ${entry.rank <= 3 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {entry.username}
            </span>
          </div>

          {/* Score */}
          <div className="col-span-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-[var(--accent-yellow)] fill-[var(--accent-yellow)]" />
              <span
                className="text-lg font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {entry.weighted_average.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Total Games */}
          <div className="col-span-2 text-center">
            <span className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-space-mono)' }}>
              {entry.total_puzzles_completed}
            </span>
          </div>

          {/* Best Time */}
          <div className="col-span-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-[var(--accent-cyan)]" />
              <span className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                {formatTime(entry.best_time_seconds)}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Mobile Cards (hidden on desktop) */}
      <div className="md:hidden space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={`mobile-${entry.user_id}`}
            className={`card-glow p-4 ${getRowStyle(entry.rank)}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getRankDisplay(entry.rank)}
                <span className="font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {entry.username}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[var(--accent-yellow)]/10 px-3 py-1 rounded-full">
                <Star className="w-4 h-4 text-[var(--accent-yellow)] fill-[var(--accent-yellow)]" />
                <span className="font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {entry.weighted_average.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                <div className="text-[var(--text-muted)] text-xs mb-1">Games</div>
                <div className="font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {entry.total_puzzles_completed}
                </div>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
                <div className="text-[var(--text-muted)] text-xs mb-1">Best Time</div>
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  <Clock className="w-3 h-3 text-[var(--accent-cyan)]" />
                  {formatTime(entry.best_time_seconds)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
