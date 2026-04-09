"use client";

import React from "react";
import { X, Star, Clock, Trophy } from "lucide-react";

interface CompletionPopupProps {
  stars: number;
  completionTime: number;
  puzzleNumber: number;
  onClose: () => void;
}

const CompletionPopup: React.FC<CompletionPopupProps> = ({
  stars,
  completionTime,
  puzzleNumber,
  onClose,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-10 h-10 transition-all duration-300 ${
          i < stars
            ? "text-[var(--accent-yellow)] fill-[var(--accent-yellow)] star-filled"
            : "text-[var(--text-muted)] star-empty"
        }`}
        style={{
          animationDelay: `${i * 0.1}s`,
          transform: i < stars ? "scale(1)" : "scale(0.8)",
        }}
      />
    ));
  };

  const getMessage = () => {
    if (stars === 5) return "PERFECT!";
    if (stars === 4) return "EXCELLENT!";
    if (stars === 3) return "GREAT JOB!";
    if (stars === 2) return "GOOD EFFORT!";
    return "COMPLETED!";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-glow-cyan p-8 max-w-sm w-full mx-4 animate-scale-in relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, var(--accent-cyan), transparent 60%)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Trophy icon */}
        <div className="flex justify-center mb-4 relative">
          <div className="p-4 rounded-full bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30">
            <Trophy className="w-12 h-12 text-[var(--accent-yellow)]" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-6 relative">
          <h2
            className="text-3xl font-bold neon-yellow mb-2"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {getMessage()}
          </h2>
          <p className="text-[var(--text-secondary)]">
            Puzzle #{puzzleNumber} Complete
          </p>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-8">{renderStars()}</div>

        {/* Completion time */}
        <div className="text-center mb-8 relative">
          <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm uppercase tracking-wide">Time</span>
          </div>
          <p
            className="text-5xl font-bold neon-cyan"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {formatTime(completionTime)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 relative">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost text-sm"
          >
            Close
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="flex-1 btn-neon text-sm"
          >
            New Puzzle
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionPopup;
