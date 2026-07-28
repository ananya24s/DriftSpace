import { useState, useLayoutEffect, useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MARK_BOUNDS, MarkShapes } from './DriftSpaceMark';

/*
  DriftSpaceLogo — the official DriftSpace wordmark.

  Letter runs are measured with a hidden Canvas 2D context instead of
  SVG getComputedTextLength(). Canvas measurement works as soon as the
  font is in document.fonts (no dependency on SVG paint timing), so the
  emblem lands in the correct position on first render even with web
  fonts. This eliminates the misalignment that SVG-text measurement
  produces with Press Start 2P.
*/

const FONT_NAME  = "'Press Start 2P', monospace";
const FONT_URL   = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
const EM         = 100;   // internal SVG font-size (user units)
const CAP        = 78;    // Press Start 2P cap height ≈ 0.78em
const PAD        = 30;    // padding around wordmark for glow bleed
const SUB_SIZE   = 15;
const SUB_GAP    = 18;

// Measure text width using Canvas 2D — reliable once the font is loaded,
// independent of SVG paint/layout timing.
function measureText(text, fontSize, letterSpacing) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${FONT_NAME}`;
    const base = ctx.measureText(text).width;
    // letter-spacing applies between each character pair (n-1 gaps)
    return base + letterSpacing * Math.max(text.length - 1, 0);
  } catch {
    return text.length * fontSize * 0.72; // safe fallback
  }
}

export function DriftSpaceLogo({
  height      = 84,
  color       = '#dff4fb',
  markFill    = '#eef8fc',
  markStroke  = '#7ff0ff',
  glowColor   = '#00e5ff',
  letterSpacing = 6,
  markScale   = 1.20,
  markGap     = { left: 2, right: 3 },
  subtitle    = null,
  pulse       = true,
  markFlaring = false,
  title       = 'DriftSpace',
  style,
  className,
}) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, '');

  // Emblem geometry (design units, scale to cap height)
  const s      = (CAP * markScale) / MARK_BOUNDS.height;
  const markW  = MARK_BOUNDS.width * s;
  const markSW = 5.0;

  // Canvas-measured widths, re-computed once the font loads
  const [m, setM] = useState({ wLeft: 0, wRight: 0, ready: false });

  useLayoutEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      const wLeft  = measureText('DRIFTSP', EM, letterSpacing);
      const wRight = measureText('CE',      EM, letterSpacing);
      if (!cancelled) setM({ wLeft, wRight, ready: true });
    };

    // Try immediately (font may already be cached)
    run();

    // Re-run once the font is confirmed loaded
    if (document.fonts?.load) {
      document.fonts.load(`${EM}px ${FONT_NAME}`).then(run).catch(run);
    }

    return () => { cancelled = true; };
  }, [letterSpacing, markScale]);

  const baseline    = PAD + CAP;
  const markLeftX   = PAD + m.wLeft + letterSpacing + markGap.left;
  const markCenterX = markLeftX + markW / 2;
  const rightX      = markLeftX + markW + letterSpacing + markGap.right;
  const totalW      = rightX + m.wRight + PAD;
  const subBaseline = baseline + SUB_GAP + SUB_SIZE;
  const totalH      = (subtitle ? subBaseline : baseline) + PAD;

  const doPulse = pulse && !reduceMotion;

  const textCommon = {
    fontFamily: FONT_NAME,
    fontSize: EM,
    letterSpacing,
    fill: color,
    dominantBaseline: 'alphabetic',
  };

  return (
    <>
      {/* Preload font for standalone use outside Menu.jsx */}
      <link rel="preload" as="style" href={FONT_URL} />
      <link rel="stylesheet" href={FONT_URL} />

      <svg
        role="img"
        aria-label={title}
        className={className}
        width={(height * totalW) / totalH}
        height={height}
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ display: 'block', overflow: 'visible', cursor: 'default', ...style }}
      >
        {/* Full-bbox hit rect so onMouseEnter fires over the whole
            wordmark, not just over painted glyph pixels. */}
        <rect x="0" y="0" width="100%" height="100%"
          fill="transparent" stroke="none" pointerEvents="all" />
        <defs>
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
            <feFlood floodColor={glowColor} floodOpacity="0.75" result="c">
              {doPulse && (
                <animate attributeName="flood-opacity" values="0.45;0.8;0.45" dur="6s"
                  repeatCount="indefinite" calcMode="spline"
                  keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
              )}
            </feFlood>
            <feComposite in="c" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* markglow: base idle glow + independent flare burst.
               stdDeviation and opacity transition via CSS on the filter
               element so the flare eases in/out without JS animation frames. */}
          <filter id={`markglow-${uid}`} x="-100%" y="-100%" width="300%" height="300%"
            style={{ transition: 'filter 0.4s ease' }}>
            <feGaussianBlur in="SourceAlpha"
              stdDeviation={markFlaring ? 12 : 6} result="blur" />
            <feFlood floodColor={glowColor}
              floodOpacity={markFlaring ? 1 : 0.72} result="c" />
            <feComposite in="c" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              {markFlaring && <feMergeNode in="glow" />}
              {markFlaring && <feMergeNode in="glow" />}
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g opacity={m.ready ? 1 : 0}>
          <g filter={`url(#glow-${uid})`}>
            <text x={PAD} y={baseline} {...textCommon}>DRIFTSP</text>
            <text x={rightX} y={baseline} {...textCommon}>CE</text>
          </g>

          <g
            transform={`translate(${markCenterX}, ${PAD + (82 - 100 * s) / 2 + 7}) scale(${s})`}
            filter={`url(#markglow-${uid})`}
            style={{ transition: 'opacity 0.4s ease' }}
          >
            <MarkShapes
              fill={markFlaring ? '#ffffff' : markFill}
              stroke={markFlaring ? '#ffffff' : markStroke}
              strokeWidth={markFlaring ? markSW * 1.3 : markSW}
              fillOpacity={markFlaring ? 1 : 0.95}
            />
          </g>

          {subtitle && (
            <text
              x={totalW / 2} y={subBaseline}
              textAnchor="middle"
              fontFamily={FONT_NAME}
              fontSize={SUB_SIZE}
              letterSpacing={SUB_SIZE * 0.5}
              fill={color} opacity={0.6}
              dominantBaseline="alphabetic"
              filter={`url(#glow-${uid})`}
            >
              {subtitle}
            </text>
          )}
        </g>
      </svg>
    </>
  );
}