import Header from '@/components/Header';
import LeaderboardTable from '@/components/LeaderboardTable';
import { Trophy } from 'lucide-react';

export default async function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] grid-bg">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center animate-slide-down">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[var(--accent-yellow)]" />
            <h1
              className="text-3xl font-bold neon-yellow"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              LEADERBOARD
            </h1>
          </div>
          <p className="text-[var(--text-muted)]">
            Top players ranked by weighted score (min 30 puzzles to qualify)
          </p>
        </div>

        <LeaderboardTable />
      </main>
    </div>
  );
}
