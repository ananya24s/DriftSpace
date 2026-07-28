import { useState, useLayoutEffect, useId, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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

// Measure text metrics using Canvas 2D — reliable once the font is loaded.
// Returns { width, ascent, descent } where ascent/descent are the actual
// rendered pixel extents above/below the baseline, not typographic estimates.
function measureText(text, fontSize, letterSpacing) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${FONT_NAME}`;
    const m = ctx.measureText(text);
    const width = m.width + letterSpacing * Math.max(text.length - 1, 0);
    // actualBoundingBox values give us the real rendered pixel extents
    const ascent  = m.actualBoundingBoxAscent  ?? fontSize * 0.75;
    const descent = m.actualBoundingBoxDescent ?? fontSize * 0.08;
    return { width, ascent, descent };
  } catch {
    const width = text.length * fontSize * 0.72;
    return { width, ascent: fontSize * 0.75, descent: fontSize * 0.08 };
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
  markBobbing = false,
  title       = 'DriftSpace',
  style,
  className,
}) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, '');

  // Emblem geometry (design units, scale to cap height)
  const s      = (CAP * markScale) / MARK_BOUNDS.height;
  const markW  = MARK_BOUNDS.width * s;
  const emblemH = MARK_BOUNDS.height * s; // total emblem height in SVG units
  const markSW = 5.0;

  // Canvas-measured widths, re-computed once the font loads
  const [m, setM] = useState({ wLeft: 0, wRight: 0, ascent: 75, descent: 6, ready: false });

  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const mLeft  = measureText('DRIFTSP', EM, letterSpacing);
      const mRight = measureText('CE',      EM, letterSpacing);
      if (!cancelled) setM({
        wLeft:   mLeft.width,
        wRight:  mRight.width,
        ascent:  mLeft.ascent,
        descent: mLeft.descent,
        ready: true,
      });
    };

    // Never measure with the fallback font — wait until Press Start 2P
    // is confirmed loaded. The SVG stays opacity:0 (via m.ready=false)
    // during this window so the user never sees the broken layout.
    if (document.fonts?.load) {
      document.fonts
        .load(`${EM}px ${FONT_NAME}`)
        .then(measure)
        .catch(measure); // measure anyway on error (best-effort)
    } else {
      // Fallback for environments without document.fonts
      measure();
    }

    return () => { cancelled = true; };
  }, [letterSpacing, markScale]);

  const baseline    = PAD + CAP;
  // Real top and bottom of the rendered glyphs (measured, not guessed)
  const glyphTop    = baseline - m.ascent;
  const glyphBot    = baseline + m.descent;
  const glyphMid    = (glyphTop + glyphBot) / 2;

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

          {/* Outer g positions the emblem; inner motion.g handles the bob.
               Keeping them separate means the SVG transform stays stable
               and only the visual layer animates. */}
          <g transform={`translate(${markCenterX}, ${glyphMid - (emblemH / 2)})`}>
            <motion.g
              filter={`url(#markglow-${uid})`}
              animate={
                reduceMotion ? undefined :
                markBobbing
                  ? { y: [-5, 0], transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                  : { y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
              }
            >
              <g transform={`scale(${s})`}>
                <MarkShapes
                  fill={markFlaring ? '#ffffff' : markFill}
                  stroke={markFlaring ? '#ffffff' : markStroke}
                  strokeWidth={markFlaring ? markSW * 1.3 : markSW}
                  fillOpacity={markFlaring ? 1 : 0.95}
                />

              </g>
            </motion.g>
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