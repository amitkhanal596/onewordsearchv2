"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, RotateCcw, Target, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import type { Cell, Direction, OneWordSearchProps } from "@/types/game";
import CompletionPopup from "@/components/CompletionPopup";
import { createClient } from "@/utils/supabase/client";
import type { RecordCompletionResponse } from "@/types/progress";

const GRID_SIZE = 5;

const OneWordSearch: React.FC<OneWordSearchProps> = ({
  board,
  words,
  number,
  puzzleId,
  puzzleDate,
}) => {
  const router = useRouter();
  const [grid, setGrid] = useState<string[][]>([]);
  const [wordsToFind, setWordsToFind] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [columnIndices, setColumnIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "correct" | "incorrect";
    word: string;
  } | null>(null);
  const [boardData, setBoardData] = useState<string[][]>([]);
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null);
  const [showCompletionPopup, setShowCompletionPopup] = useState<boolean>(false);
  const [completionStars, setCompletionStars] = useState<number>(0);

  const convertBoardToGrid = (boardData: string[][]) => {
    const grid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(""));
    const indices = Array(GRID_SIZE).fill(0);
    for (
      let colIndex = 0;
      colIndex < GRID_SIZE && colIndex < boardData.length;
      colIndex++
    ) {
      const column = boardData[colIndex];
      const columnLetters = column.slice(0, GRID_SIZE).reverse();
      indices[colIndex] = GRID_SIZE;
      for (let rowIndex = 0; rowIndex < GRID_SIZE; rowIndex++) {
        grid[rowIndex][colIndex] = columnLetters[rowIndex];
      }
    }
    return { grid, indices };
  };

  useEffect(() => {
    const { grid: initialGrid, indices } = convertBoardToGrid(board);
    setGrid(initialGrid);
    setColumnIndices(indices);
    setWordsToFind(words);
    setFoundWords([]);
    setSelectedCells([]);
    setGameWon(false);
    setStartTime(null);
    setElapsedTime(0);
    setFeedback(null);
    setBoardData(board);
    setPuzzleNumber(number);
  }, [board, words, number]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !gameWon) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, gameWon]);

  const checkSelectedWord = useCallback(() => {
    if (selectedCells.length !== 5) return;
    const selectedWord = selectedCells
      .map(([row, col]) => grid[row][col])
      .join("");
    const foundWord = wordsToFind.find((word) => word === selectedWord);
    if (foundWord && !foundWords.includes(foundWord)) {
      if (foundWords.length === 0 && !startTime) setStartTime(Date.now());
      setIsAnimating(true);
      setFeedback({ type: "correct", word: foundWord });
      setFoundWords((prev) => [...prev, foundWord]);
      const newGrid = grid.map((row) => [...row]);
      selectedCells.forEach(([row, col]) => (newGrid[row][col] = ""));
      setTimeout(() => {
        const { newGrid: droppedGrid, newIndices } = dropLetters(
          newGrid,
          columnIndices
        );
        setGrid(droppedGrid);
        setColumnIndices(newIndices);
        setSelectedCells([]);
        setIsAnimating(false);
        setFeedback(null);
        if (foundWords.length + 1 >= wordsToFind.length) setGameWon(true);
      }, 1000);
    } else {
      setIsAnimating(true);
      setFeedback({ type: "incorrect", word: selectedWord });
      setTimeout(() => {
        setSelectedCells([]);
        setIsAnimating(false);
        setFeedback(null);
      }, 1000);
    }
  }, [selectedCells, grid, wordsToFind, foundWords, startTime, columnIndices]);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isSelecting && !isAnimating) {
        if (selectedCells.length === 5) checkSelectedWord();
        setIsSelecting(false);
      }
    };
    document.addEventListener("mouseup", handleMouseUpGlobal);
    return () => document.removeEventListener("mouseup", handleMouseUpGlobal);
  }, [isSelecting, isAnimating, selectedCells, checkSelectedWord]);

  useEffect(() => {
    if (gameWon && elapsedTime > 0) {
      handleGameCompletion();
    }
  }, [gameWon]);

  const calculateStarsClient = (seconds: number): number => {
    if (seconds < 60) return 5;
    if (seconds < 120) return 4;
    if (seconds < 180) return 3;
    if (seconds < 240) return 2;
    return 1;
  };

  const handleGameCompletion = useCallback(async () => {
    const sessionId = crypto.randomUUID();
    let stars = calculateStarsClient(elapsedTime);

    if (puzzleId) {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const response = await fetch("/api/progress/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              puzzle_id: puzzleId,
              puzzle_date: puzzleDate,
              completion_time_seconds: elapsedTime,
              session_id: sessionId,
            }),
          });

          if (response.ok) {
            const data: RecordCompletionResponse = await response.json();
            stars = data.stars;
            console.info("Puzzle completion recorded:", data);
          } else {
            console.warn("Failed to record completion:", await response.text());
          }
        } else {
          console.info(
            "User not authenticated, showing popup with client-calculated stars"
          );
        }
      } catch (error) {
        console.error("Error recording completion:", error);
      }
    } else {
      console.info(
        "No puzzleId provided, showing popup with client-calculated stars"
      );
    }

    setCompletionStars(stars);
    setShowCompletionPopup(true);
  }, [elapsedTime, puzzleId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getNextLetter = (
    columnIndex: number,
    currentIndices: number[]
  ): string => {
    const columnData = boardData[columnIndex];
    const currentIndex = currentIndices[columnIndex];
    return columnData && currentIndex < columnData.length
      ? columnData[currentIndex]
      : "placeholder";
  };

  const dropLetters = (
    gridAfterRemoval: string[][],
    currentIndices: number[]
  ) => {
    const newGrid = gridAfterRemoval.map((row) => [...row]);
    const newIndices = [...currentIndices];
    for (let col = 0; col < GRID_SIZE; col++) {
      const hasEmptyCells = gridAfterRemoval.some((row) => row[col] === "");
      if (!hasEmptyCells) continue;
      const columnLetters: string[] = [];
      for (let row = 0; row < GRID_SIZE; row++) {
        const cell = gridAfterRemoval[row][col];
        if (cell !== "") columnLetters.push(cell);
      }
      for (let row = 0; row < GRID_SIZE; row++) newGrid[row][col] = "";
      const startRow = GRID_SIZE - columnLetters.length;
      for (let i = 0; i < columnLetters.length; i++)
        newGrid[startRow + i][col] = columnLetters[i];
      const newLetters: string[] = [];
      for (let i = 0; i < startRow; i++) {
        newLetters.push(getNextLetter(col, newIndices));
        newIndices[col]++;
      }
      for (let i = 0; i < startRow; i++) {
        newGrid[i][col] = newLetters[startRow - 1 - i];
      }
    }
    return { newGrid, newIndices };
  };

  const getFiveLetterSequence = (
    startRow: number,
    startCol: number,
    direction: Direction
  ): Cell[] | null => {
    const [dr, dc] = direction;
    const sequence: Cell[] = [];
    for (let i = 0; i < 5; i++) {
      const newRow = startRow + i * dr;
      const newCol = startCol + i * dc;
      if (
        newRow >= 0 &&
        newRow < GRID_SIZE &&
        newCol >= 0 &&
        newCol < GRID_SIZE
      ) {
        sequence.push([newRow, newCol]);
      } else return null;
    }
    return sequence;
  };

  const getDirection = (
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): Direction | null => {
    const rowDiff = endRow - startRow;
    const colDiff = endCol - startCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    if (absRowDiff === 0 && absColDiff > 0) return [0, colDiff > 0 ? 1 : -1];
    if (absColDiff === 0 && absRowDiff > 0) return [rowDiff > 0 ? 1 : -1, 0];
    if (absRowDiff === absColDiff && absRowDiff > 0)
      return [rowDiff > 0 ? 1 : -1, colDiff > 0 ? 1 : -1];
    return null;
  };

  const handleCellMouseDown = (row: number, col: number) => {
    if (isAnimating) return;
    setIsSelecting(true);
    setSelectedCells([[row, col]]);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting || isAnimating) return;
    setSelectedCells((prev) => {
      if (prev.length === 0) return [[row, col]];
      const [startRow, startCol] = prev[0];
      if (startRow === row && startCol === col) return [prev[0]];
      const direction = getDirection(startRow, startCol, row, col);
      return direction
        ? getFiveLetterSequence(startRow, startCol, direction) || [prev[0]]
        : [prev[0]];
    });
  };

  const isCellSelected = (row: number, col: number): boolean =>
    selectedCells.some(([r, c]) => r === row && c === col);

  const progress = wordsToFind.length > 0 ? (foundWords.length / wordsToFind.length) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] grid-bg">
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 py-3">
        {/* Game Info Card */}
        <div className="w-full max-w-md card-glow p-5 mb-3 animate-slide-down">
          {/* Puzzle Number */}
          {puzzleNumber !== null && (
            <div className="text-center mb-4">
              <span
                className="text-2xl font-bold neon-cyan"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                PUZZLE #{puzzleNumber}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Timer */}
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-4 py-2 rounded-lg border border-[var(--border-subtle)]">
              <Clock className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span
                className="font-bold text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {formatTime(elapsedTime)}
              </span>
            </div>

            {/* Words Found */}
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-4 py-2 rounded-lg border border-[var(--border-subtle)]">
              <Target className="w-4 h-4 text-[var(--accent-green)]" />
              <span
                className="font-bold text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {foundWords.length}/{wordsToFind.length}
              </span>
            </div>

            {/* New Game Button */}
            <button
              onClick={() => router.replace("/")}
              disabled={isAnimating}
              className="flex items-center gap-2 btn-neon text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              NEW
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {!gameWon && (
          <div className="mb-4 min-h-[48px] flex justify-center items-center">
            {feedback && (
              <div
                className={`
                  px-6 py-3 rounded-lg border-2 animate-scale-in
                  ${
                    feedback.type === "correct"
                      ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/50 text-[var(--accent-green)]"
                      : "bg-[var(--accent-pink)]/10 border-[var(--accent-pink)]/50 text-[var(--accent-pink)]"
                  }
                `}
              >
                <p
                  className="font-bold text-center"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {feedback.type === "correct" ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {feedback.word}
                    </span>
                  ) : (
                    <span>{feedback.word}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Game Board */}
        <div className="card-glow-cyan p-6 mb-3 animate-scale-in">
          <div
            className="grid grid-cols-5 gap-2"
            onMouseLeave={() => setIsSelecting(false)}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isSelected = isCellSelected(rowIndex, colIndex);
                const cellIndex = rowIndex * 5 + colIndex;

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center font-bold cursor-pointer select-none rounded-xl
                      transition-all duration-150
                      ${
                        isSelected
                          ? "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] scale-105 shadow-lg"
                          : "bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:scale-102"
                      }
                      ${isAnimating ? "pointer-events-none" : ""}
                      ${
                        feedback?.type === "correct" && isSelected
                          ? "animate-cell-pop"
                          : ""
                      }
                      ${
                        feedback?.type === "incorrect" && isSelected
                          ? "animate-cell-shake"
                          : ""
                      }
                    `}
                    style={{
                      fontFamily: "var(--font-space-mono)",
                      boxShadow: isSelected
                        ? "0 0 20px rgba(0, 245, 255, 0.4)"
                        : "none",
                      animationDelay: isSelected
                        ? `${cellIndex * 0.03}s`
                        : "0s",
                    }}
                    onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() =>
                      handleCellMouseEnter(rowIndex, colIndex)
                    }
                    onTouchStart={() => handleCellMouseDown(rowIndex, colIndex)}
                  >
                    <span className="text-2xl sm:text-3xl font-bold">
                      {cell}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center max-w-md px-4">
          <p className="text-[var(--text-muted)] text-sm mb-1">
            Drag in any direction to select a 5-letter word
          </p>
          <p className="text-[var(--text-secondary)] text-sm">
            Find all <span className="text-[var(--accent-yellow)] font-bold">10 words</span> to complete the puzzle
          </p>
        </div>
      </main>

      {/* Completion Popup */}
      {showCompletionPopup && puzzleNumber !== null && (
        <CompletionPopup
          stars={completionStars}
          completionTime={elapsedTime}
          puzzleNumber={puzzleNumber}
          onClose={() => setShowCompletionPopup(false)}
        />
      )}
    </div>
  );
};

export default OneWordSearch;
