import { useState, useRef, useCallback, useEffect } from 'react';
import { connectRoom, makeRoomCode, normalizeRoomCode } from '../services/versus';
import audioManager from '../assets/audio/AudioManager';

/*
  Versus match state machine.

  idle → connecting → waiting (host) ─┐
                  └→ (guest finds host) → ready → countdown → playing → result
                                                        ↑                 │
                                                        └──── rematch ────┘

  Each player runs their own normal game locally. Only small messages cross
  the wire: live status (score/lives/wave), attacks, deaths and rematches.
*/

const COUNTDOWN_FROM     = 3;
const COUNTDOWN_STEP_MS  = 900;
const HOST_START_DELAY   = 1200;
const JOIN_TIMEOUT_MS    = 6000;
const CONNECT_TIMEOUT_MS = 9000;
const STATUS_INTERVAL_MS = 250;
// Presence can miss a player whose connection dies without a clean close
// (phone locked, Wi-Fi drop), so both sides also ping; silence = gone.
const HEARTBEAT_MS       = 2000;
const SILENCE_TIMEOUT_MS = 8000;

const EMPTY_OPP = { name: '', score: 0, lives: 3, wave: 1, connected: false };

// callbacks.onMatchStart() — countdown hit GO, start a fresh game
// callbacks.onMatchEnd()   — the match was decided, stop the game
export function useVersus(callbacks = {}) {
  const callbacksRef = useRef(callbacks);
  useEffect(() => { callbacksRef.current = callbacks; });

  const [phase, setPhaseState] = useState('idle');
  const [code, setCode]         = useState('');
  const [role, setRole]         = useState(null);
  const [myName, setMyName]     = useState('');
  const [opponent, setOpponent] = useState(EMPTY_OPP);
  const [error, setError]       = useState(null);
  const [count, setCount]       = useState(0);
  const [result, setResult]     = useState(null);
  const [rematch, setRematch]   = useState({ me: false, opp: false });
  const [incoming, setIncoming] = useState({ n: 0, tick: 0 });

  const phaseRef       = useRef('idle');
  const roleRef        = useRef(null);
  const oppRef         = useRef(EMPTY_OPP);
  const opponentIdRef  = useRef(null);
  const rematchRef     = useRef({ me: false, opp: false });
  const roomRef        = useRef(null);
  const myScoreRef     = useRef(0);
  const myDeadRef      = useRef(false);
  const attackQueueRef = useRef(0);   // read & drained by the game loop
  const timersRef      = useRef([]);
  const statusRef      = useRef({ last: 0, timer: null, latest: null });
  const lastHeardRef   = useRef(0);
  const heartbeatRef   = useRef(null);
  const goneIdsRef     = useRef(new Set()); // opponents we've declared gone

  const setPhase = useCallback(p => { phaseRef.current = p; setPhaseState(p); }, []);

  const updateOpp = useCallback(patch => {
    oppRef.current = { ...oppRef.current, ...patch };
    setOpponent(oppRef.current);
  }, []);

  const setRematchBoth = useCallback(r => { rematchRef.current = r; setRematch(r); }, []);

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

  const finish = useCallback((outcome, reason) => {
    setResult({ outcome, reason, myScore: myScoreRef.current, oppScore: oppRef.current.score });
    setPhase('result');
    callbacksRef.current.onMatchEnd?.();
  }, [setPhase]);

  const startCountdown = useCallback(() => {
    attackQueueRef.current = 0;
    myDeadRef.current = false;
    myScoreRef.current = 0;
    setIncoming({ n: 0, tick: 0 });
    setResult(null);
    setRematchBoth({ me: false, opp: false });
    updateOpp({ score: 0, lives: 3, wave: 1 });
    setPhase('countdown');

    let n = COUNTDOWN_FROM;
    setCount(n);
    audioManager.playCountdown(false);
    const tick = () => {
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
  }, [later, setPhase, setRematchBoth, updateOpp]);

  // Host kicks off a match; the guest starts when it hears 'start'
  const hostStart = useCallback(() => {
    if (roleRef.current !== 'host' || !roomRef.current) return;
    roomRef.current.send('start');
    startCountdown();
  }, [startCountdown]);

  const resetAll = useCallback(() => {
    clearTimers();
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    goneIdsRef.current = new Set();
    if (opponentIdRef.current) roomRef.current?.send('bye');
    roomRef.current?.leave();
    roomRef.current = null;
    opponentIdRef.current = null;
    roleRef.current = null;
    oppRef.current = EMPTY_OPP;
    attackQueueRef.current = 0;
    myDeadRef.current = false;
    setOpponent(EMPTY_OPP);
    setRole(null);
    setCode('');
    setResult(null);
    setRematchBoth({ me: false, opp: false });
    setPhase('idle');
  }, [clearTimers, setPhase, setRematchBoth]);

  const fail = useCallback(message => {
    resetAll();
    setError(message);
  }, [resetAll]);

  const handleOpponentGone = useCallback(() => {
    if (!opponentIdRef.current) return;
    goneIdsRef.current.add(opponentIdRef.current);
    opponentIdRef.current = null;
    updateOpp({ connected: false });
    const phaseNow = phaseRef.current;
    if (phaseNow === 'countdown' || phaseNow === 'playing') {
      clearTimers();
      finish('win', 'disconnect');
    } else if (phaseNow === 'ready') {
      if (roleRef.current === 'host') setPhase('waiting');
      else fail('HOST LEFT THE ROOM');
    }
  }, [clearTimers, fail, finish, setPhase, updateOpp]);

  const handleMessage = useCallback(msg => {
    // Ignore anyone who isn't our paired opponent
    if (!opponentIdRef.current || msg.from !== opponentIdRef.current) return;
    lastHeardRef.current = Date.now();
    const phaseNow = phaseRef.current;

    switch (msg.type) {
      case 'ping':
        break;
      case 'bye':
        handleOpponentGone();
        break;
      case 'start':
        if (roleRef.current === 'guest' && (phaseNow === 'ready' || phaseNow === 'result')) startCountdown();
        break;
      case 'status':
        updateOpp({ score: msg.score, lives: msg.lives, wave: msg.wave });
        break;
      case 'attack':
        if (phaseNow === 'playing' && !myDeadRef.current) {
          attackQueueRef.current += msg.count;
          setIncoming(i => ({ n: msg.count, tick: i.tick + 1 }));
        }
        break;
      case 'dead':
        updateOpp({ score: msg.score, lives: 0 });
        if (phaseNow === 'playing' && !myDeadRef.current) {
          finish('win', 'opponent-dead');
        } else if (myDeadRef.current) {
          // Both died within network delay of each other — settle on score.
          // Both sides compare the same two numbers, so they always agree.
          const mine = myScoreRef.current;
          const outcome = mine > msg.score ? 'win' : mine < msg.score ? 'lose' : 'draw';
          setResult({ outcome, reason: 'both-dead', myScore: mine, oppScore: msg.score });
        }
        break;
      case 'rematch': {
        const r = { ...rematchRef.current, opp: true };
        setRematchBoth(r);
        if (r.me && r.opp) hostStart();
        break;
      }
      default:
        break;
    }
  }, [finish, handleOpponentGone, hostStart, setRematchBoth, startCountdown, updateOpp]);

  const handleMembers = useCallback((members, myId) => {
    const myIndex = members.findIndex(m => m.id === myId);
    if (myIndex >= 2) { fail('ROOM FULL'); return; }

    const other = members.slice(0, 2).find(m => m.id !== myId && !goneIdsRef.current.has(m.id));
    const phaseNow = phaseRef.current;

    if (other) {
      if (other.role === roleRef.current) {
        // Two hosts on one code (or two guests with no host) — not a valid pair
        if (roleRef.current === 'host' && myIndex > 0) fail('CODE CLASH — HOST AGAIN');
        return;
      }
      if (opponentIdRef.current === other.id) return;
      opponentIdRef.current = other.id;
      lastHeardRef.current = Date.now();
      updateOpp({ name: other.name, connected: true });
      if (phaseNow === 'waiting' || phaseNow === 'connecting') {
        setPhase('ready');
        audioManager.playPowerUp('SHIELD');
        if (roleRef.current === 'host') {
          later(() => { if (phaseRef.current === 'ready') hostStart(); }, HOST_START_DELAY);
        }
      }
      return;
    }

    // Opponent is gone
    handleOpponentGone();
  }, [fail, handleOpponentGone, hostStart, later, setPhase, updateOpp]);

  const open = useCallback((roomCode, asRole, name) => {
    resetAll();
    setError(null);
    roleRef.current = asRole;
    setRole(asRole);
    setMyName(name);
    setCode(roomCode);
    setPhase('connecting');

    let connected = false;
    roomRef.current = connectRoom({
      code: roomCode, name, role: asRole,
      handlers: {
        members: handleMembers,
        message: handleMessage,
        status: s => {
          if (s === 'error') { fail("CAN'T REACH SERVER"); return; }
          connected = true;
          if (asRole === 'host' && phaseRef.current === 'connecting') setPhase('waiting');
        },
      },
    });

    later(() => { if (!connected) fail("CAN'T REACH SERVER"); }, CONNECT_TIMEOUT_MS);

    heartbeatRef.current = setInterval(() => {
      if (!opponentIdRef.current) return;
      roomRef.current?.send('ping');
      if (Date.now() - lastHeardRef.current > SILENCE_TIMEOUT_MS) handleOpponentGone();
    }, HEARTBEAT_MS);
    if (asRole === 'guest') {
      later(() => {
        if (phaseRef.current === 'connecting') fail(connected ? 'ROOM NOT FOUND' : "CAN'T REACH SERVER");
      }, JOIN_TIMEOUT_MS);
    }
  }, [fail, handleMembers, handleMessage, handleOpponentGone, later, resetAll, setPhase]);

  const host = useCallback(name => open(makeRoomCode(), 'host', name), [open]);

  const join = useCallback((name, input) => {
    const roomCode = normalizeRoomCode(input);
    if (!roomCode) { setError('ENTER A CODE LIKE DRIFT-7K2'); return; }
    open(roomCode, 'guest', name);
  }, [open]);

  // ---- Called by the game ----

  const sendStatus = useCallback(status => {
    myScoreRef.current = status.score;
    const st = statusRef.current;
    st.latest = status;
    const flush = () => {
      st.timer = null;
      st.last = Date.now();
      if (phaseRef.current === 'playing') roomRef.current?.send('status', st.latest);
    };
    const wait = STATUS_INTERVAL_MS - (Date.now() - st.last);
    if (wait <= 0) flush();
    else if (!st.timer) st.timer = setTimeout(flush, wait);
  }, []);

  const sendAttack = useCallback(n => {
    if (phaseRef.current === 'playing' && !myDeadRef.current) roomRef.current?.send('attack', { count: n });
  }, []);

  const reportDeath = useCallback(score => {
    myDeadRef.current = true;
    myScoreRef.current = score;
    roomRef.current?.send('dead', { score });
    if (phaseRef.current === 'playing') finish('lose', 'you-dead');
  }, [finish]);

  const requestRematch = useCallback(() => {
    if (!oppRef.current.connected || rematchRef.current.me) return;
    const r = { ...rematchRef.current, me: true };
    setRematchBoth(r);
    roomRef.current?.send('rematch');
    if (r.me && r.opp) hostStart();
  }, [hostStart, setRematchBoth]);

  const leave = useCallback(() => { resetAll(); setError(null); }, [resetAll]);

  // Closing the tab: tell the rival right away instead of waiting for silence
  useEffect(() => {
    const onHide = () => { if (opponentIdRef.current) roomRef.current?.send('bye'); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  useEffect(() => () => {
    clearTimers();
    clearInterval(heartbeatRef.current);
    roomRef.current?.leave();
  }, [clearTimers]);

  return {
    phase, code, role, myName, opponent, error, count, result, rematch, incoming,
    attackQueueRef,
    host, join, leave, requestRematch,
    sendStatus, sendAttack, reportDeath,
    clearError: () => setError(null),
  };
}
