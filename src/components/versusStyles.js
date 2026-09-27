// Shared styles for the versus lobby and result screens
const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const CYAN       = '#00e5ff';
const RED        = '#ff3b3b';

export const st = {
  overlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(3,4,8,0.94)', padding: 16, boxSizing: 'border-box',
    fontFamily: FONT_MONO,
  },
  panel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    border: '1px solid rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.02)',
    padding: 'clamp(20px, 4vh, 40px) clamp(22px, 5vw, 52px)',
    width: 'min(420px, 100%)', maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box',
    animation: 'vs-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
  },
  title: {
    fontFamily: FONT_PIXEL, fontSize: 22, letterSpacing: 6, color: '#eaf7fc',
    textShadow: '0 0 24px rgba(0,229,255,0.55)',
  },
  subtitle: { fontSize: 9, letterSpacing: 3, color: 'rgba(0,229,255,0.55)' },
  divider: { width: '100%', height: 1, background: 'rgba(0,229,255,0.15)', margin: '4px 0' },
  label: { fontSize: 9, letterSpacing: 4, color: 'rgba(0,229,255,0.5)', alignSelf: 'flex-start' },
  input: {
    background: 'transparent', border: '1px solid rgba(0,229,255,0.35)', color: CYAN,
    fontFamily: FONT_PIXEL, fontSize: 16, letterSpacing: 4, textAlign: 'center',
    padding: '12px 14px', width: '100%', outline: 'none', boxSizing: 'border-box',
  },
  btnCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', marginTop: 4 },
  error: { fontSize: 9, letterSpacing: 2, color: RED, alignSelf: 'center' },
  status: {
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 3, color: CYAN,
    textShadow: '0 0 12px rgba(0,229,255,0.5)', margin: '6px 0', textAlign: 'center', lineHeight: 1.6,
  },
  codeBox: {
    fontFamily: FONT_PIXEL, fontSize: 'clamp(16px, 4.5vw, 22px)', letterSpacing: 4, color: '#fff', whiteSpace: 'nowrap',
    textShadow: '0 0 20px rgba(0,229,255,0.6)', background: 'rgba(0,229,255,0.05)',
    border: '1px dashed rgba(0,229,255,0.5)', padding: '16px 22px 14px', cursor: 'pointer',
  },
  copyHint: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)' },
  hint: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.6 },
  slots: { display: 'flex', flexDirection: 'column', gap: 6, width: '100%' },
  slot: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid', padding: '8px 12px', background: 'rgba(255,255,255,0.015)',
  },
  slotNum: { fontFamily: FONT_PIXEL, fontSize: 8 },
  youTag: {
    fontFamily: FONT_MONO, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.15)', padding: '2px 5px',
  },
  openSlot: { fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.2)' },
  pilot: { fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  vs: { fontFamily: FONT_PIXEL, fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  countNum: { fontFamily: FONT_PIXEL, fontSize: 56, lineHeight: 1.2, margin: '8px 0' },
};
