import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function submitScore(name, score) {
  const { data, error } = await supabase
    .from('scores')
    .insert([{ name: name.toUpperCase().trim(), score }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTopScores(limit = 20) {
  // Fetch more rows than needed so that after deduplication (one entry
  // per pilot name, keeping their personal best) we still have enough
  // to fill the requested number of slots.
  const { data, error } = await supabase
    .from('scores')
    .select('id, name, score, created_at')
    .order('score', { ascending: false })
    .limit(limit * 6);
  if (error) throw error;

  // Deduplicate: keep only the highest score per unique name.
  // Since rows are already sorted descending, the first occurrence
  // of each name is always their personal best.
  const seen = new Set();
  const deduped = [];
  for (const row of data) {
    const key = row.name.toUpperCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
      if (deduped.length >= limit) break;
    }
  }
  return deduped;
}

export async function fetchPilotCount() {
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true });
  if (error) return null;
  return count;
}