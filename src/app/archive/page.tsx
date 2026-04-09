import Header from '@/components/Header';
import ArchiveGrid from '@/components/ArchiveGrid';
import { createClient } from '@/utils/supabase/server';
import { Archive } from 'lucide-react';

const FIRST_PUZZLE_DATE = new Date('2024-02-22');

function getDatesSince(startDate: Date): string[] {
  const today = new Date();
  const dates = [];

  const current = new Date(startDate);
  while (current <= today) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);

    current.setDate(current.getDate() + 1);
  }

  return dates.reverse(); // Most recent first
}

async function getCompletionData(): Promise<Record<string, { stars: number; completionTime: number }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.info('[ArchivePage] User not authenticated, skipping completion data fetch');
      return {};
    }

    // Fetch user's game results with puzzle information
    const { data: completions, error } = await supabase
      .from('game_results')
      .select(`
        puzzle_id,
        completion_time_seconds,
        stars,
        puzzles!inner (
          puzzle_date
        )
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('[ArchivePage] Error fetching completions:', error);
      return {};
    }

    if (!completions) {
      return {};
    }

    // Convert completions to date-based map
    const completionMap: Record<string, { stars: number; completionTime: number }> = {};
    completions.forEach((completion) => {
      const puzzles = completion.puzzles;
      if (puzzles && typeof puzzles === 'object' && 'puzzle_date' in puzzles) {
        const puzzleDate = (puzzles as { puzzle_date: string }).puzzle_date;
        if (puzzleDate) {
          // If there are multiple completions for the same puzzle, keep the best one (most stars)
          if (!completionMap[puzzleDate] || completion.stars > completionMap[puzzleDate].stars) {
            completionMap[puzzleDate] = {
              stars: completion.stars,
              completionTime: completion.completion_time_seconds,
            };
          }
        }
      }
    });

    return completionMap;
  } catch (error) {
    console.error('[ArchivePage] Error fetching completion data:', error);
    return {};
  }
}

export default async function ArchivePage() {
  const dates = getDatesSince(FIRST_PUZZLE_DATE);
  const completionData = await getCompletionData();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] grid-bg">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center animate-slide-down">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-[var(--accent-cyan)]" />
            <h1
              className="text-3xl font-bold neon-cyan"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              PUZZLE ARCHIVE
            </h1>
          </div>
          <p className="text-[var(--text-muted)]">
            {dates.length} puzzles available - Play any previous challenge
          </p>
        </div>

        <ArchiveGrid puzzleDates={dates} completionData={completionData} />
      </main>
    </div>
  );
}
