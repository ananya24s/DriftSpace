import { useState, useCallback } from 'react';
import { fetchTopScores, fetchPilotCount } from '../services/supabase';

export function useLeaderboard() {
  const [scores, setScores] = useState([]);
  const [pilotCount, setPilotCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, count] = await Promise.all([fetchTopScores(), fetchPilotCount()]);
      setScores(data || []);
      setPilotCount(count);
    } catch (e) {
      setError('SIGNAL LOST. UNABLE TO REACH SERVER.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { scores, pilotCount, loading, error, load };
}