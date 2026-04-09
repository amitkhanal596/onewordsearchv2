export type Cell = [number, number];
export type Direction = [number, number];

export interface Puzzle {
  board: string[][];
  words: string[];
  number: number;
}

export interface OneWordSearchProps {
  board: string[][];
  words: string[];
  number: number;
  puzzleId?: string;
  puzzleDate?: string;
}

// Puzzle Service Types
export interface PuzzleServiceResponse {
  id: string;
  puzzleNumber: number;
  puzzleDate: string;
  board: string[][];
  words: string[];
  difficulty?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PuzzleDbRow {
  id: string;
  puzzle_number: number;
  puzzle_date: string;
  board: string[][];
  words: string[];
  difficulty: string | null;
  category: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PuzzleServiceError {
  error: string;
  code: string;
  statusCode: number;
  requestId?: string;
}
