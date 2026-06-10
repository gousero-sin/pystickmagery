// echolith-dash.js — Echolith school spell (Dash)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP } from '../core/utils.js?v=7';
import { drawEcholithHorns, drawEcholithStar } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Demon Step',
  icon: '♆',
  key: '6',
  category: 'Dash',
  color: '#8f0713',
  c2: '#ff3b29',
  core: '#ffd0a3',
  speed: 0,
  dmg: 0,
  mana: 18,
  cd: 780,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithDash: true,
  echolithSide: 'evil',
  dashMax: 210,
  dashWidth: 34,
  desc: 'Blink through an infernal brimstone cut, leaving demon hoof-marks and damned afterimages',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const x = ax + dx * t;
  const y = ay + dy * t;
  return { t, x, y, dist: Math.hypot(px - x, py - y) };
}

export const FIRE_HANDLERS = {
  isEcholithDash(s, ox, oy, tx, ty) {
    const px = state.player.x + state.player.w / 2;
    const py = state.player.y + state.player.h / 2;

    const dx = tx - px;
    const dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    const maxLen = s.dashMax || 210;
    const dashLen = Math.min(maxLen, len);

    const nx = dx / len;
    const ny = dy / len;
    const endX = px + nx * dashLen;
    const endY = py + ny * dashLen;

    const clampedX = clamp(endX, 20, state.W - 20);
    const clampedY = clamp(endY, 20, state.H - 28);

    state.player.x = clampedX - state.player.w / 2;
    state.player.y = clampedY - state.player.h / 2;
    state.player.vx = nx * 6;
    state.player.vy = ny * 4;

    for (const e of state.entities) {
      if (!e.active) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const hit = distToSegment(ex, ey, px, py, clampedX, clampedY);
      if (hit.dist > (s.dashWidth || 34)) continue;

      const k = Math.max(0.2, 1 - hit.dist / (s.dashWidth || 34));
      e.vx += nx * (12 * k) / (e.mass || 1);
      e.vy += ny * (7 * k) / (e.mass || 1) - 0.8;

      spawnP(ex, ey, s.c2, 3, 'burst');
    }

    state.vfxSequences.push({
      type: 'echolith_dash_slash',
      state: 0,
      age: 0,
      spell: s,
      x1: px,
      y1: py,
      x2: clampedX,
      y2: clampedY,
      phase: Math.random() * Math.PI * 2,
      ghosts: Array.from({ length: 6 }, (_, i) => ({ t: i / 5, wobble: Math.random() * Math.PI * 2 })),
      pulseHits: 0,
    });

    state.shockwaves.push({ x: clampedX, y: clampedY, r: 0, maxR: 58, life: 9, maxLife: 9, color: s.c2 });
    state.dynamicLights.push({ x: clampedX, y: clampedY, r: 110, color: s.core, int: 1.8, life: 7, ml: 7 });
    state.shake(7);

    SoundFX.playSweep(1400, 280, 'triangle', 0.2, 0.08);
    SoundFX.playNoise(0.16, 0.06, 1600, 'bandpass', 5);

    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_dash_slash(v) {
    const s = v.spell;
    v.phase += 0.35;

    if (v.age % 2 === 0) {
      const t = Math.random();
      const x = v.x1 + (v.x2 - v.x1) * t;
      const y = v.y1 + (v.y2 - v.y1) * t;
      spawnP(x, y, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
    }

    if ((v.age === 4 || v.age === 8) && v.pulseHits < 2) {
      v.pulseHits += 1;
      const t = v.pulseHits / 3;
      const hx = v.x1 + (v.x2 - v.x1) * t;
      const hy = v.y1 + (v.y2 - v.y1) * t;
      state.shockwaves.push({ x: hx, y: hy, r: 0, maxR: 34, life: 8, maxLife: 8, color: s.core });
      state.dynamicLights.push({ x: hx, y: hy, r: 70, color: s.c2, int: 1.3, life: 4, ml: 4 });
      SoundFX.playTone(980 - v.pulseHits * 160, 'triangle', 0.05, 0.06);
    }

    const headT = Math.min(1, (v.age + 2) / 14);
    state.dynamicLights.push({
      x: v.x1 + (v.x2 - v.x1) * headT,
      y: v.y1 + (v.y2 - v.y1) * headT,
      r: 62,
      color: s.c2,
      int: 0.9,
      life: 2,
      ml: 2,
    });

    if (v.age > 16) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_dash_slash(v, X) {
    const s = v.spell;
    const phase = v.phase || 0;
    const a = Math.max(0, 1 - v.age / 16);
    const dx = v.x2 - v.x1;
    const dy = v.y2 - v.y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;

    X.save();

    X.globalAlpha = 0.22 * a;
    X.strokeStyle = s.color;
    X.lineWidth = 12;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    X.globalAlpha = 0.85 * a;
    X.strokeStyle = s.c2;
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    // Omen shutters moving across the brimstone lane.
    for (let i = 0; i < 4; i++) {
      const t = ((phase * 0.08 + i * 0.22) % 1 + 1) % 1;
      const cx = v.x1 + dx * t;
      const cy = v.y1 + dy * t;
      const spread = 8 + Math.sin(phase + i) * 3;
      X.globalAlpha = 0.4 * a;
      X.strokeStyle = i % 2 === 0 ? s.core : s.c2;
      X.lineWidth = 1.4;
      X.beginPath();
      X.moveTo(cx - px * spread, cy - py * spread);
      X.lineTo(cx + px * spread, cy + py * spread);
      X.stroke();
    }

    for (const g of v.ghosts || []) {
      const t = Math.max(0, Math.min(1, g.t + Math.sin(phase + g.wobble) * 0.03));
      const gx = v.x1 + dx * t + px * Math.sin(phase + g.wobble) * 6;
      const gy = v.y1 + dy * t + py * Math.sin(phase + g.wobble) * 6;
      X.globalAlpha = 0.2 * a;
      X.fillStyle = s.core;
      X.beginPath();
      X.arc(gx, gy, 4, 0, Math.PI * 2);
      X.fill();

      drawEcholithStar(X, gx, gy, 7, phase + g.wobble, s.c2, 0.18 * a);
    }

    drawEcholithHorns(X, v.x2, v.y2 + 5, 28, phase, s.c2, 0.52 * a);

    X.restore();
  },
};
