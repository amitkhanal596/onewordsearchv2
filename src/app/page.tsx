import OneWordSearch from "@/components/OneWordSearch";
import { fetchPuzzle, getRandomDateString } from "@/utils/puzzles";
import { generatePuzzleId } from "@/utils/puzzle-id";
import { notFound } from "next/navigation";

export default async function HomePage() {
  const randomDate = getRandomDateString();
  const puzzle = await fetchPuzzle(randomDate);

  if (!puzzle) {
    return notFound();
  }

  // Generate deterministic UUID from puzzle date
  const puzzleId = generatePuzzleId(randomDate);

  return (
    <OneWordSearch
      board={puzzle.board}
      words={puzzle.words}
      number={puzzle.number}
      puzzleId={puzzleId}
      puzzleDate={randomDate}
    />
  );
}
