"use client";

import Link from "next/link";
import { Calendar, Star, Clock, Check } from "lucide-react";
import { useState } from "react";

interface CompletionData {
  stars: number;
  completionTime: number;
}

interface ArchiveGridProps {
  puzzleDates: string[];
  completionData: Record<string, CompletionData>;
}

const ArchiveGrid: React.FC<ArchiveGridProps> = ({
  puzzleDates,
  completionData,
}) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: stars }, (_, i) => (
      <Star
        key={i}
        className="w-4 h-4 text-[var(--accent-yellow)] fill-[var(--accent-yellow)]"
      />
    ));
  };

  const handleMouseEnter = (date: string, event: React.MouseEvent) => {
    if (completionData[date]) {
      setHoveredDate(date);
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredDate(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {puzzleDates.map((date, i, arr) => {
          const puzzleNumber = arr.length - i;
          const isCompleted = !!completionData[date];
          const completion = completionData[date];

          return (
            <Link
              key={date}
              href={`/puzzle/${date}`}
              className="group block animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}
              onMouseEnter={(e) => handleMouseEnter(date, e)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className={`
                  card-glow p-4 transition-all duration-200
                  hover:scale-105 hover:z-10 relative
                  ${
                    isCompleted
                      ? "border-l-4 border-l-[var(--accent-green)] bg-[var(--accent-green)]/5"
                      : "border-l-4 border-l-transparent hover:border-l-[var(--accent-cyan)]"
                  }
                `}
              >
                {/* Puzzle Number */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-lg font-bold ${
                      isCompleted
                        ? "text-[var(--accent-green)]"
                        : "text-[var(--text-primary)]"
                    }`}
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    #{puzzleNumber}
                  </span>
                  {isCompleted && (
                    <div className="flex items-center gap-1 bg-[var(--accent-green)]/20 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-[var(--accent-green)]" />
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(date)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tooltip for completed puzzles */}
      {hoveredDate && completionData[hoveredDate] && (
        <div
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="card-glow px-4 py-3 shadow-xl">
            <div className="flex items-center gap-1 mb-2">
              {renderStars(completionData[hoveredDate].stars)}
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Clock className="w-3 h-3 text-[var(--accent-cyan)]" />
              <span className="text-sm" style={{ fontFamily: "var(--font-space-mono)" }}>
                {formatTime(completionData[hoveredDate].completionTime)}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid var(--bg-card)",
            }}
          />
        </div>
      )}
    </>
  );
};

export default ArchiveGrid;
