import { useState, useEffect } from 'react';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";

/*
  PortraitOverlay — shown on touch devices when held in portrait orientation.
  Listens to the Screen Orientation API with a matchMedia fallback for
  older iOS Safari. Disappears automatically on rotate to landscape.
  Not rendered at all on desktop (same media query as MobileControls).
*/
export function PortraitOverlay() {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    // Screen Orientation API (Android Chrome)
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', check);
    }
    // matchMedia fallback (iOS Safari)
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener('change', check);
    window.addEventListener('resize', check);
    return () => {
      screen?.orientation?.removeEventListener('change', check);
      mq.removeEventListener('change', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  // Only visible on touch devices (media query in mobile.css)
  // and only when portrait
  if (!isPortrait) return null;

  return (
    <div className="ds-portrait-overlay" style={st.overlay}>
      <div style={st.icon}>⟳</div>
      <div style={st.title}>ROTATE DEVICE</div>
      <div style={st.sub}>
        DriftSpace is best played<br />in landscape mode
      </div>
    </div>
  );
}

const st = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(3,4,8,0.97)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 20,
    // Hidden on desktop via mobile.css media query
    display: 'none',
  },
  icon: {
    fontSize: 52,
    color: '#00e5ff',
    filter: 'drop-shadow(0 0 16px rgba(0,229,255,0.6))',
    animation: 'none',
  },
  title: {
    fontFamily: FONT_PIXEL, fontSize: 14, letterSpacing: 3,
    color: '#eaf7fc',
    textShadow: '0 0 20px rgba(0,229,255,0.5)',
  },
  sub: {
    fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2,
    color: 'rgba(255,255,255,0.38)', textAlign: 'center',
    lineHeight: 1.8,
  },
};