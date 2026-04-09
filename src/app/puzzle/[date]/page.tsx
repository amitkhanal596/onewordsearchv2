import { notFound } from 'next/navigation';
import OneWordSearch from '@/components/OneWordSearch';
import { fetchPuzzle } from '@/utils/puzzles';
import { generatePuzzleId } from '@/utils/puzzle-id';

export default async function PuzzlePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const puzzle = await fetchPuzzle(date);

  if (!puzzle) {
    return notFound();
  }

  // Generate deterministic UUID from puzzle date
  // This ensures we always have a puzzleId, even for puzzles not yet in database
  // The auto-insert functionality will use this same ID when creating the puzzle record
  const puzzleId = generatePuzzleId(date);

  return (
    <main className="min-h-screen bg-teal-50">
      <OneWordSearch
        board={puzzle.board}
        words={puzzle.words}
        number={puzzle.number}
        puzzleId={puzzleId}
        puzzleDate={date}
      />
    </main>
  );
}
