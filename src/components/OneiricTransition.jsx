import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../styles/oneiric.css';

const RING_COUNT = 3;
const MOTE_COUNT = 14;

// How long the veil holds before the parent dismisses it (ms).
const HOLD_MS = 900;
const HOLD_MS_REDUCED = 320;

/**
 * Oneiric battle-entry flourish — a dreamlike veil that blooms over the
 * Lobby→Battle handoff and dissolves to reveal the duel. Themed by the
 * selected school's color (the Dream school is its showcase).
 *
 * @param {{ color?: string, rune?: string, schoolName?: string, onComplete?: () => void }} props
 */
export default function OneiricTransition({ color = 'var(--arcane, #7c3aed)', rune = '◆', schoolName = '', onComplete }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const hold = reduce ? HOLD_MS_REDUCED : HOLD_MS;
    const t = setTimeout(() => onComplete?.(), hold);
    return () => clearTimeout(t);
  }, [reduce, onComplete]);

  // Deterministic drifting motes so the layout is stable across renders.
  const motes = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        delay: (i % 7) * 0.06,
        drift: 60 + (i % 5) * 24,
        size: 2 + (i % 3),
        dur: 1.1 + (i % 4) * 0.18,
      })),
    [],
  );

  const veil = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, filter: 'blur(12px)' },
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <motion.div
      className="oneiric"
      style={{ '--oneiric-color': color }}
      aria-hidden="true"
      {...veil}
    >
      <div className="oneiric__bloom" />

      {!reduce && (
        <>
          {Array.from({ length: RING_COUNT }, (_, i) => (
            <motion.span
              key={`ring-${i}`}
              className="oneiric__ring"
              initial={{ scale: 0.2, opacity: 0.55 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.1, delay: i * 0.22, ease: 'easeOut' }}
            />
          ))}

          {motes.map((m) => (
            <motion.span
              key={`mote-${m.id}`}
              className="oneiric__mote"
              style={{ left: m.left, width: m.size, height: m.size }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: -m.drift, opacity: [0, 0.9, 0] }}
              transition={{ duration: m.dur, delay: m.delay, ease: 'easeOut' }}
            />
          ))}
        </>
      )}

      <motion.div
        className="oneiric__sigil"
        style={{ color }}
        initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0, rotate: -8 }}
        animate={reduce ? { opacity: 1 } : { scale: [0.6, 1.08, 1], opacity: 1, rotate: 0 }}
        transition={{ duration: reduce ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="oneiric__rune">{rune}</span>
        {schoolName ? <span className="oneiric__name">Abrindo o sigilo de {schoolName}…</span> : null}
      </motion.div>
    </motion.div>
  );
}
