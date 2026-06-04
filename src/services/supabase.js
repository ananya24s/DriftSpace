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
  const { data, error } = await supabase
    .from('scores')
    .select('id, name, score, created_at')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchPilotCount() {
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true });
  if (error) return null;
  return count;
}