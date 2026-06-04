import { useState, useCallback } from 'react';

const KEY = 'driftspace_scores';

export function useHighScores() {
  const [scores, setScores] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { return []; }
  });

  const saveScore = useCallback((score) => {
    setScores(prev => {
      const updated = [...prev, score].sort((a, b) => b - a).slice(0, 10);
      localStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearScores = useCallback(() => {
    localStorage.removeItem(KEY);
    setScores([]);
  }, []);

  return { scores, saveScore, clearScores };
}