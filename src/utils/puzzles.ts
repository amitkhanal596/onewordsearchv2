import type { Puzzle } from '@/types/game';

export async function fetchPuzzle(date: string): Promise<Puzzle | null> {
  try {
    const apiUrl = `https://onewordsearch.com/${date}.json`;

    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://onewordsearch.com/',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch puzzle for date: ${date}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    return null;
  }
}

export function getRandomDateString(): string {
  const firstDate = new Date(Date.UTC(2024, 1, 21)); // Feb 21, 2024
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
  const randomOffset = Math.floor(Math.random() * diffDays);
  const randomDate = new Date(firstDate.getTime() + randomOffset * 24 * 60 * 60 * 1000);
  return randomDate.toISOString().split("T")[0]; // YYYY-MM-DD
}
