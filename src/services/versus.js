import { supabase } from './supabase';

/*
  Versus rooms use Supabase Realtime only (Broadcast + Presence).
  Nothing is written to the database, so the leaderboard is never touched.
  A room exists only while players are connected to its channel.
*/

// No 0/O or 1/I so codes are easy to read out loud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode() {
  let s = '';
  for (let i = 0; i < 3; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `DRIFT-${s}`;
}

// Accepts "drift-7k2", "7K2", "DRIFT7K2" etc. Returns null if unusable.
export function normalizeRoomCode(input) {
  let raw = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.startsWith('DRIFT')) raw = raw.slice(5);
  if (raw.length !== 3) return null;
  return `DRIFT-${raw}`;
}

function makeId() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

/**
 * Joins a room channel.
 * handlers.members(list, myId) — everyone currently in the room, oldest first
 * handlers.message(payload)    — a broadcast from the other player
 * handlers.status('connected' | 'error')
 */
export function connectRoom({ code, name, role, handlers }) {
  const id = makeId();
  const joinedAt = Date.now();
  const channel = supabase.channel(`driftspace-versus:${code}`, {
    config: { broadcast: { self: false }, presence: { key: id } },
  });

  channel.on('broadcast', { event: 'msg' }, ({ payload }) => handlers.message?.(payload));

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const members = Object.values(state)
      .map(entries => entries[0])
      .filter(Boolean)
      .map(m => ({ id: m.id, name: m.name, role: m.role, joinedAt: m.joinedAt }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
    handlers.members?.(members, id);
  });

  channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      try {
        await channel.track({ id, name, role, joinedAt });
        handlers.status?.('connected');
      } catch {
        handlers.status?.('error');
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      handlers.status?.('error');
    }
  });

  return {
    id,
    joinedAt,
    send(type, data = {}) {
      channel.send({ type: 'broadcast', event: 'msg', payload: { type, from: id, ...data } })
        .catch(() => {});
    },
    leave() {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    },
  };
}
