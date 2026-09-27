import { useState, useRef, useCallback, useEffect } from 'react';
import { connectRoom, makeRoomCode, normalizeRoomCode } from '../services/versus';
import audioManager from '../assets/audio/AudioManager';

/*
  Versus match state machine — 2 to 4 pilots per room.

  idle → connecting → lobby ──(host presses START)──→ countdown → playing
                        ↑                                             │
                        │                     (you run out of lives)  ├→ spectating ─┐
                        │                                             │              │
                        └──── late joiners wait here      (≤1 pilot left) → result ←─┘
                                                                          │
                                           host presses PLAY AGAIN ───────┘→ countdown

  Each pilot runs their own normal game locally. Only small messages cross
  the wire: live status, attacks (aimed at the current leader), deaths.
  The host only decides who is in a round and when it starts.
*/

export const MAX_PLAYERS = 4;
// Rival colours by roster slot. Cyan is left out on purpose: it's the colour
// of your own ship and bullets.
export const PLAYER_COLORS = ['#ff3b3b', '#ffd700', '#ff4dff', '#b4ff39'];

// Quick emotes — short arcade-style text, sent by index
export const EMOTES = ['GLHF', 'GG', 'NICE!', 'LOL', 'OOPS', 'RIP'];
const EMOTE_COOLDOWN_MS  = 1200;
const EMOTE_TTL_MS       = 2800;
const EMOTE_FEED_MAX     = 3;

const COUNTDOWN_FROM     = 3;
const COUNTDOWN_STEP_MS  = 900;
const JOIN_TIMEOUT_MS    = 6000;
const CONNECT_TIMEOUT_MS = 9000;
const STATUS_INTERVAL_MS = 250;
const START_RESEND_MS    = 400;  // 'start' is sent twice in case one is lost
// Presence can miss a pilot whose connection dies without a clean close
// (phone locked, Wi-Fi drop), so everyone pings; silence mid-match = gone.
const HEARTBEAT_MS       = 2000;
const SILENCE_TIMEOUT_MS = 8000;
// Phones suspend background pages (e.g. the host switching to WhatsApp to
// share the code), which drops them from presence. In the lobby we wait this
// long for them to come back before calling the room closed.
const HOST_GRACE_MS      = 20000;

const ACTIVE_PHASES = ['countdown', 'playing', 'spectating'];

// Final standings: survivors first, then by the place each pilot claimed when
// they went down, then score. Every client sorts the same data the same way.
function rankPlayers(players) {
  return [...players]
    .sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if ((a.rank ?? 0) !== (b.rank ?? 0)) return (a.rank ?? 0) - (b.rank ?? 0);
      return b.score - a.score;
    })
    .map((p, i) => ({ ...p, place: i + 1 }));
}

// callbacks.onMatchStart() — countdown hit GO: start a fresh game
// callbacks.onGameOver()   — stop our game (we're out, or the match is decided)
export function useVersus(callbacks = {}) {
  const callbacksRef = useRef(callbacks);
  useEffect(() => { callbacksRef.current = callbacks; });

  const [phase, setPhaseState] = useState('idle');
  const [code, setCode]         = useState('');
  const [role, setRole]         = useState(null);
  const [myName, setMyName]     = useState('');
  const [myId, setMyId]         = useState(null);
  const [members, setMembers]   = useState([]);   // who's in the room (lobby list)
  const [players, setPlayers]   = useState([]);   // pilots in the current match
  const [busy, setBusy]         = useState(false); // joined mid-match, waiting
  const [hostPresent, setHostPresent] = useState(false);
  const [error, setError]       = useState(null);
  const [count, setCount]       = useState(0);
  const [result, setResult]     = useState(null);
  const [incoming, setIncoming] = useState({ n: 0, tick: 0, name: '', color: '' });
  const [emotes, setEmotes]     = useState([]);   // recent emotes feed

  const phaseRef       = useRef('idle');
  const roleRef        = useRef(null);
  const myIdRef        = useRef(null);
  const roomRef        = useRef(null);
  const membersRef     = useRef([]);
  const hostIdRef      = useRef(null);
  const playersRef     = useRef({});      // id → player, current match
  const rosterRef      = useRef([]);      // ids in the current match, slot order
  const matchIdRef     = useRef(null);
  const lastHeardRef   = useRef({});      // id → timestamp
  const goneIdsRef     = useRef(new Set());
  const presenceSeenRef = useRef(new Set()); // ids Supabase presence has listed at least once
  const meRef          = useRef(null);       // our own { id, name, role, joinedAt }
  const hostListRef    = useRef(false);      // guest: have we received the host's official list?
  const busySentRef    = useRef(new Set());
  const myDeadRef      = useRef(false);
  const attackQueueRef = useRef([]);      // colours of incoming asteroids; drained by the game loop
  const timersRef      = useRef([]);
  const statusRef      = useRef({ last: 0, timer: null, latest: null });
  const heartbeatRef   = useRef(null);
  const lastEmoteRef   = useRef(0);

  const setPhase = useCallback(p => { phaseRef.current = p; setPhaseState(p); }, []);

  const later = useCallback((fn, ms) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    clearTimeout(statusRef.current.timer);
    statusRef.current = { last: 0, timer: null, latest: null };
  }, []);

  const publishPlayers = useCallback(() => {
    setPlayers(rosterRef.current.map(id => ({ ...playersRef.current[id] })));
  }, []);

  const aliveIds = useCallback(() => rosterRef.current.filter(id => playersRef.current[id]?.alive), []);

  // ---- Match end ----

  const checkMatchOver = useCallback(() => {
    if (!ACTIVE_PHASES.includes(phaseRef.current)) return;
    if (aliveIds().length > 1) return;

    const ranking = rankPlayers(rosterRef.current.map(id => playersRef.current[id]));
    const me = ranking.find(p => p.id === myIdRef.current);
    const wasFlying = phaseRef.current !== 'spectating';
    clearTimeout(statusRef.current.timer);
    setResult({ ranking, myPlace: me?.place ?? ranking.length });
    setPhase('result');
    if (wasFlying) callbacksRef.current.onGameOver?.();
  }, [aliveIds, setPhase]);

  const eliminate = useCallback((id, rank) => {
    const p = playersRef.current[id];
    if (!p || !p.alive) return;
    p.alive = false;
    p.rank = rank ?? aliveIds().length + 1;
    publishPlayers();
    checkMatchOver();
  }, [aliveIds, checkMatchOver, publishPlayers]);

  // ---- Emotes ----

  // Match colour if in a round, otherwise the lobby slot colour
  // (Presence can lag a moment behind messages, so the sender's name also
  // travels with the emote; unknown pilots show in neutral white.)
  const pilotLook = useCallback((id, sentName) => {
    const p = playersRef.current[id];
    if (p) return { name: p.name, color: p.color };
    const i = membersRef.current.findIndex(m => m.id === id);
    if (i < 0) return { name: sentName || 'PILOT', color: '#ffffff' };
    return { name: membersRef.current[i].name, color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
  }, []);

  const pushEmote = useCallback((from, index, sentName) => {
    const text = EMOTES[index];
    if (!text) return;
    const { name, color } = pilotLook(from, sentName);
    const key = `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry = { key, name, color, text, isMe: from === myIdRef.current };
    setEmotes(list => [...list.slice(-(EMOTE_FEED_MAX - 1)), entry]);
    setTimeout(() => setEmotes(list => list.filter(e => e.key !== key)), EMOTE_TTL_MS);
  }, [pilotLook]);

  const sendEmote = useCallback(index => {
    if (!roomRef.current || membersRef.current.length < 2 || !EMOTES[index]) return;
    const now = Date.now();
    if (now - lastEmoteRef.current < EMOTE_COOLDOWN_MS) return;
    lastEmoteRef.current = now;
    roomRef.current.send('emote', { e: index, name: pilotLook(myIdRef.current).name });
    pushEmote(myIdRef.current, index);
    audioManager.playEmote();
  }, [pilotLook, pushEmote]);

  // ---- Starting a round ----

  const startMatch = useCallback((roster, matchId) => {
    if (matchId === matchIdRef.current) return; // duplicate 'start'
    if (!roster.some(r => r.id === myIdRef.current)) {
      setBusy(true); // round started without us — we're in the next one
      return;
    }
    matchIdRef.current = matchId;
    clearTimers();

    const now = Date.now();
    playersRef.current = {};
    rosterRef.current = roster.map(r => r.id);
    roster.forEach((r, i) => {
      playersRef.current[r.id] = {
        id: r.id, name: r.name, color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        score: 0, lives: 3, wave: 1, alive: true, rank: null, connected: true,
        isMe: r.id === myIdRef.current,
      };
      lastHeardRef.current[r.id] = now;
    });
    publishPlayers();
    attackQueueRef.current = [];
    myDeadRef.current = false;
    setBusy(false);
    setResult(null);
    setIncoming({ n: 0, tick: 0, name: '', color: '' });
    setPhase('countdown');

    let n = COUNTDOWN_FROM;
    setCount(n);
    audioManager.playCountdown(false);
    const tick = () => {
      if (phaseRef.current !== 'countdown') return; // match ended (everyone left)
      n -= 1;
      if (n > 0) {
        setCount(n);
        audioManager.playCountdown(false);
        later(tick, COUNTDOWN_STEP_MS);
      } else {
        setCount(0);
        audioManager.playCountdown(true);
        setPhase('playing');
        callbacksRef.current.onMatchStart?.();
      }
    };
    later(tick, COUNTDOWN_STEP_MS);
  }, [clearTimers, later, publishPlayers, setPhase]);

  // Host: start a round with everyone currently in the room (max 4)
  const start = useCallback(() => {
    if (roleRef.current !== 'host' || !roomRef.current) return;
    const roster = membersRef.current.slice(0, MAX_PLAYERS).map(m => ({ id: m.id, name: m.name }));
    if (roster.length < 2) return;
    const matchId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    startMatch(roster, matchId); // (clears pending timers, so send after)
    roomRef.current.send('start', { roster, matchId });
    later(() => roomRef.current?.send('start', { roster, matchId }), START_RESEND_MS);
  }, [later, startMatch]);

  // ---- Leaving ----

  const resetAll = useCallback(() => {
    clearTimers();
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    if (membersRef.current.length > 1) roomRef.current?.send('bye');
    roomRef.current?.leave();
    roomRef.current = null;
    roleRef.current = null;
    myIdRef.current = null;
    membersRef.current = [];
    hostIdRef.current = null;
    playersRef.current = {};
    rosterRef.current = [];
    matchIdRef.current = null;
    lastHeardRef.current = {};
    goneIdsRef.current = new Set();
    presenceSeenRef.current = new Set();
    meRef.current = null;
    hostListRef.current = false;
    busySentRef.current = new Set();
    attackQueueRef.current = [];
    myDeadRef.current = false;
    setRole(null);
    setMyId(null);
    setCode('');
    setMembers([]);
    setPlayers([]);
    setBusy(false);
    setHostPresent(false);
    setResult(null);
    setEmotes([]);
    setPhase('idle');
  }, [clearTimers, setPhase]);

  const fail = useCallback(message => {
    resetAll();
    setError(message);
  }, [resetAll]);

  // Host: share the official pilot list (slot order + who didn't fit)
  const broadcastRoom = useCallback((overflow = []) => {
    if (roleRef.current !== 'host') return;
    roomRef.current?.send('room', { members: membersRef.current, overflow });
  }, []);

  // intentional: they pressed LEAVE / closed the tab ('bye'), vs. just vanished
  const handleGone = useCallback((id, intentional = false) => {
    if (id === myIdRef.current || goneIdsRef.current.has(id)) return;
    goneIdsRef.current.add(id);
    presenceSeenRef.current.delete(id);
    delete lastHeardRef.current[id];

    membersRef.current = membersRef.current.filter(m => m.id !== id);
    setMembers(membersRef.current);
    broadcastRoom();

    const p = playersRef.current[id];
    if (p) {
      p.connected = false;
      if (ACTIVE_PHASES.includes(phaseRef.current)) eliminate(id);
      else publishPlayers();
    }

    if (id === hostIdRef.current) {
      hostIdRef.current = null;
      setHostPresent(false);
      if (phaseRef.current === 'lobby' || phaseRef.current === 'connecting') {
        if (intentional) fail('HOST LEFT THE ROOM');
        else later(() => { if (!hostIdRef.current && phaseRef.current === 'lobby') fail('HOST LEFT THE ROOM'); }, HOST_GRACE_MS);
      }
    }
  }, [broadcastRoom, eliminate, fail, later, publishPlayers]);

  // ---- Who is in the room ----
  //
  // The host owns the official pilot list: pilots keep their slot, newcomers
  // go after, and anyone past slot 4 is told the room is full. Guests adopt
  // the host's list, so every screen shows the same slots and colours. (Join
  // times come from each device's clock, which can be off, so they're only
  // used to order pilots while we're still joining.)

  const applyRoom = useCallback(room => {
    const meId = myIdRef.current;
    const joined = room.filter(m => !membersRef.current.some(x => x.id === m.id) && m.id !== meId);
    membersRef.current = room;
    setMembers(room);

    const hostMember = room.find(m => m.role === 'host');
    if (hostMember) { hostIdRef.current = hostMember.id; setHostPresent(true); }

    const now = Date.now();
    room.forEach(m => { if (!(m.id in lastHeardRef.current)) lastHeardRef.current[m.id] = now; });

    if (joined.length && phaseRef.current === 'lobby') audioManager.playPowerUp('SHIELD');
    if (roleRef.current === 'guest' && phaseRef.current === 'connecting' && hostMember) setPhase('lobby');

    // Host: pilots who arrive mid-match wait for the next round
    if (roleRef.current === 'host' && phaseRef.current !== 'lobby') {
      room.forEach(m => {
        if (m.id !== meId && !rosterRef.current.includes(m.id) && !busySentRef.current.has(m.id)) {
          busySentRef.current.add(m.id);
          roomRef.current?.send('busy', { to: m.id });
        }
      });
    }
  }, [setPhase]);

  // Merges pilots we've learned about (from presence or 'hello')
  const mergeRoom = useCallback((candidates, { announce = false } = {}) => {
    const isHost = roleRef.current === 'host';
    const valid = candidates.filter(c => !goneIdsRef.current.has(c.id));
    const known = membersRef.current
      .filter(m => !goneIdsRef.current.has(m.id))
      .map(m => valid.find(c => c.id === m.id) ?? m);
    // Once a guest has the host's list, the host places newcomers
    const fresh = (isHost || !hostListRef.current)
      ? valid.filter(c => !membersRef.current.some(m => m.id === c.id))
      : [];
    let all = [...known, ...fresh];
    if (phaseRef.current === 'connecting') all = all.sort((a, b) => a.joinedAt - b.joinedAt);

    const room = all.slice(0, MAX_PLAYERS);
    const changed = room.length !== membersRef.current.length
      || room.some((m, i) => m.id !== membersRef.current[i]?.id);
    applyRoom(room);
    if (isHost && (changed || announce || all.length > MAX_PLAYERS)) {
      broadcastRoom(all.slice(MAX_PLAYERS).map(m => m.id));
    }
  }, [applyRoom, broadcastRoom]);

  // ---- Incoming messages ----

  const handleMessage = useCallback(msg => {
    const from = msg.from;
    if (!from) return;

    // A pilot announcing themselves (instant — presence can lag seconds behind)
    if (msg.type === 'hello' || msg.type === 'hello-back') {
      if (!ACTIVE_PHASES.includes(phaseRef.current)) goneIdsRef.current.delete(from);
      if (goneIdsRef.current.has(from)) return;
      lastHeardRef.current[from] = Date.now();
      mergeRoom([{
        id: from,
        name: typeof msg.name === 'string' ? msg.name.slice(0, 12) : 'PILOT',
        role: msg.role === 'host' ? 'host' : 'guest',
        joinedAt: Number(msg.joinedAt) || Date.now(),
      }], { announce: msg.type === 'hello' });
      if (msg.type === 'hello' && meRef.current) roomRef.current?.send('hello-back', meRef.current);
      return;
    }

    // The host's official pilot list
    if (msg.type === 'room') {
      const list = Array.isArray(msg.members) ? msg.members : [];
      if (!list.some(m => m.id === from && m.role === 'host') || roleRef.current === 'host') return;
      const meId = myIdRef.current;
      if (Array.isArray(msg.overflow) && msg.overflow.includes(meId)) { fail('ROOM FULL'); return; }
      if (!list.some(m => m.id === meId)) return; // host hasn't placed us yet
      hostListRef.current = true;
      applyRoom(list
        .filter(m => m && typeof m.id === 'string' && !goneIdsRef.current.has(m.id))
        .slice(0, MAX_PLAYERS)
        .map(m => ({
          id: m.id,
          name: typeof m.name === 'string' ? m.name.slice(0, 12) : 'PILOT',
          role: m.role === 'host' ? 'host' : 'guest',
          joinedAt: Number(m.joinedAt) || 0,
        })));
      return;
    }

    if (goneIdsRef.current.has(from)) return;
    lastHeardRef.current[from] = Date.now();
    const p = playersRef.current[from];
    const inMatch = ACTIVE_PHASES.includes(phaseRef.current);

    switch (msg.type) {
      case 'start':
        if (from === hostIdRef.current) startMatch(msg.roster, msg.matchId);
        break;
      case 'busy':
        if (msg.to === myIdRef.current && phaseRef.current === 'lobby') setBusy(true);
        break;
      case 'status':
      case 'ping':
        if (p && inMatch && msg.matchId === matchIdRef.current) {
          if (msg.score != null) { p.score = msg.score; p.lives = msg.lives; p.wave = msg.wave; }
          publishPlayers();
          // A lost 'dead' message gets corrected by the next ping
          if (msg.alive === false) eliminate(from, msg.rank);
        }
        break;
      case 'attack':
        if (msg.to === myIdRef.current && phaseRef.current === 'playing' && !myDeadRef.current && p) {
          for (let i = 0; i < msg.count; i++) attackQueueRef.current.push(p.color);
          setIncoming(inc => ({ n: msg.count, tick: inc.tick + 1, name: p.name, color: p.color }));
        }
        break;
      case 'dead':
        if (p && msg.matchId === matchIdRef.current) {
          p.score = msg.score;
          p.lives = 0;
          eliminate(from, msg.rank);
        }
        break;
      case 'bye':
        handleGone(from, true);
        break;
      case 'emote':
        pushEmote(from, msg.e, typeof msg.name === 'string' ? msg.name.slice(0, 12) : '');
        audioManager.playEmote();
        break;
      default:
        break;
    }
  }, [applyRoom, eliminate, fail, handleGone, mergeRoom, publishPlayers, pushEmote, startMatch]);

  // Supabase presence: the source of truth for who has *left*
  const handleMembers = useCallback((list, meId) => {
    // Between matches, a pilot who dropped out (phone went to background)
    // and reconnected is welcome back. Mid-match they stay out.
    if (!ACTIVE_PHASES.includes(phaseRef.current)) {
      list.forEach(m => goneIdsRef.current.delete(m.id));
    }
    const present = list.filter(m => !goneIdsRef.current.has(m.id));

    const otherHost = present.find(m => m.role === 'host' && m.id !== meId);
    if (roleRef.current === 'host' && otherHost && otherHost.joinedAt < (meRef.current?.joinedAt ?? Infinity)) {
      fail('CODE CLASH — HOST AGAIN');
      return;
    }

    // Left = presence listed them before and doesn't now. (Pilots we only
    // know from 'hello' so far aren't dropped just because presence is slow.)
    const ids = new Set(present.map(m => m.id));
    membersRef.current.forEach(m => {
      if (presenceSeenRef.current.has(m.id) && !ids.has(m.id)) handleGone(m.id);
    });
    present.forEach(m => presenceSeenRef.current.add(m.id));

    mergeRoom(present);
  }, [fail, handleGone, mergeRoom]);

  // ---- Connecting ----

  const open = useCallback((roomCode, asRole, name) => {
    resetAll();
    setError(null);
    roleRef.current = asRole;
    setRole(asRole);
    setMyName(name);
    setCode(roomCode);
    setPhase('connecting');

    let connected = false;
    try {
      roomRef.current = connectRoom({
        code: roomCode, name, role: asRole,
        handlers: {
          members: handleMembers,
          message: handleMessage,
          status: s => {
            // After the first connect, errors are transient (phone waking up);
            // the realtime client rejoins by itself and we re-announce ourselves
            if (s === 'error') { if (!connected) fail("CAN'T REACH SERVER"); return; }
            connected = true;
            // Add ourselves and announce to the room straight away (also on
            // every reconnect); everyone already here answers with 'hello-back'
            if (meRef.current) {
              mergeRoom([meRef.current]);
              roomRef.current?.send('hello', meRef.current);
            }
            if (asRole === 'host' && phaseRef.current === 'connecting') setPhase('lobby');
          },
        },
      });
    } catch {
      fail("CAN'T REACH SERVER");
      return;
    }
    myIdRef.current = roomRef.current.id;
    setMyId(roomRef.current.id);
    meRef.current = { id: roomRef.current.id, name, role: asRole, joinedAt: roomRef.current.joinedAt };
    // List ourselves from the start, so the room-full check counts us
    mergeRoom([meRef.current]);

    later(() => { if (!connected) fail("CAN'T REACH SERVER"); }, CONNECT_TIMEOUT_MS);
    if (asRole === 'guest') {
      later(() => {
        if (phaseRef.current === 'connecting') fail(connected ? 'ROOM NOT FOUND' : "CAN'T REACH SERVER");
      }, JOIN_TIMEOUT_MS);
    }

    heartbeatRef.current = setInterval(() => {
      if (!roomRef.current || membersRef.current.length < 2) return;
      const inMatch = ACTIVE_PHASES.includes(phaseRef.current) || phaseRef.current === 'result';
      const me = playersRef.current[myIdRef.current];
      roomRef.current.send('ping', inMatch && me
        ? { matchId: matchIdRef.current, alive: me.alive, rank: me.rank, score: me.score, lives: me.lives, wave: me.wave }
        : {});
      // Mid-match, a silent pilot counts as gone (lobby relies on presence,
      // so a friend who briefly switches apps isn't kicked)
      if (ACTIVE_PHASES.includes(phaseRef.current)) {
        const now = Date.now();
        rosterRef.current.forEach(id => {
          if (id !== myIdRef.current && now - (lastHeardRef.current[id] ?? now) > SILENCE_TIMEOUT_MS) handleGone(id);
        });
      }
    }, HEARTBEAT_MS);
  }, [fail, handleGone, handleMembers, handleMessage, later, mergeRoom, resetAll, setPhase]);

  const host = useCallback(name => open(makeRoomCode(), 'host', name), [open]);

  const join = useCallback((name, input) => {
    const roomCode = normalizeRoomCode(input);
    if (!roomCode) { setError('ENTER A CODE LIKE DRIFT-7K2'); return; }
    open(roomCode, 'guest', name);
  }, [open]);

  const leave = useCallback(() => { resetAll(); setError(null); }, [resetAll]);

  // ---- Called by the game ----

  const sendStatus = useCallback(status => {
    const me = playersRef.current[myIdRef.current];
    if (me) { me.score = status.score; me.lives = status.lives; me.wave = status.wave; }
    const st = statusRef.current;
    st.latest = status;
    const flush = () => {
      st.timer = null;
      st.last = Date.now();
      if (phaseRef.current === 'playing') {
        roomRef.current?.send('status', { ...st.latest, matchId: matchIdRef.current });
      }
    };
    const wait = STATUS_INTERVAL_MS - (Date.now() - st.last);
    if (wait <= 0) flush();
    else if (!st.timer) st.timer = setTimeout(flush, wait);
  }, []);

  // Attacks go to the rival currently in the lead (random among ties)
  const sendAttack = useCallback(n => {
    if (phaseRef.current !== 'playing' || myDeadRef.current) return;
    const rivals = aliveIds().filter(id => id !== myIdRef.current).map(id => playersRef.current[id]);
    if (!rivals.length) return;
    const top = Math.max(...rivals.map(r => r.score));
    const leaders = rivals.filter(r => r.score === top);
    const target = leaders[Math.floor(Math.random() * leaders.length)];
    roomRef.current?.send('attack', { to: target.id, count: n });
  }, [aliveIds]);

  const reportDeath = useCallback(score => {
    if (myDeadRef.current || !['countdown', 'playing'].includes(phaseRef.current)) return;
    myDeadRef.current = true;
    const me = playersRef.current[myIdRef.current];
    if (me) { me.score = score; me.lives = 0; }
    const rank = aliveIds().length; // e.g. 3 still flying including me → 3rd place
    roomRef.current?.send('dead', { score, rank, matchId: matchIdRef.current });
    if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') setPhase('spectating');
    eliminate(myIdRef.current, rank);
    callbacksRef.current.onGameOver?.();
  }, [aliveIds, eliminate, setPhase]);

  // Closing the tab: tell the room right away instead of waiting for silence
  useEffect(() => {
    const onHide = () => { if (membersRef.current.length > 1) roomRef.current?.send('bye'); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  useEffect(() => () => {
    clearTimers();
    clearInterval(heartbeatRef.current);
    roomRef.current?.leave();
  }, [clearTimers]);

  return {
    phase, code, role, myName, myId, members, players, busy, hostPresent,
    error, count, result, incoming, emotes,
    attackQueueRef,
    host, join, leave, start, sendEmote,
    sendStatus, sendAttack, reportDeath,
    clearError: () => setError(null),
  };
}
