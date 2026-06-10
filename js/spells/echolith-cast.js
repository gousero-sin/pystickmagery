// echolith-cast.js — Echolith school spell (Cast)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { drawEcholithHalo, drawEcholithHorns, drawEcholithSigil } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Stigmata Bloom',
  icon: '✹',
  key: '4',
  category: 'Cast',
  color: '#fff1a8',
  c2: '#9f0a18',
  core: '#fff8df',
  speed: 0,
  dmg: 34,
  mana: 24,
  cd: 700,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithCast: true,
  echolithSide: 'threshold',
  bloomR: 112,
  bloomForce: 12,
  desc: 'Open a sacred wound-flower: divine petals pull the guilty inward, infernal thorns tear sin back out',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export const FIRE_HANDLERS = {
  isEcholithCast(s, ox, oy, tx, ty) {
    const cx = clamp(tx, 36, state.W - 36);
    const cy = clamp(ty, 80, state.H - 36);

    state.vfxSequences.push({
      type: 'echolith_cast_fault_bloom',
      state: 0,
      age: 0,
      cx,
      cy,
      spell: s,
      phase: Math.random() * Math.PI * 2,
      petals: Array.from({ length: 12 }, (_, i) => ({
        a: (i / 12) * Math.PI * 2,
        r: 8 + Math.random() * 10,
        spin: 0.02 + Math.random() * 0.035,
      })),
      fragments: [],
      detDone: false,
    });

    SoundFX.playSweep(220, 980, 'triangle', 0.22, 0.16);
    spawnP(cx, cy, s.color, 8, 'burst');
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_cast_fault_bloom(v) {
    const s = v.spell;
    v.phase += 0.1;

    if (v.state === 0) {
      if (v.age % 2 === 0) {
        for (const p of v.petals) {
          p.r += 2.1;
          p.a += p.spin;
          const px = v.cx + Math.cos(p.a + v.age * 0.02) * p.r;
          const py = v.cy + Math.sin(p.a + v.age * 0.02) * p.r * 0.82;
          spawnP(px, py, Math.random() > 0.5 ? s.c2 : s.color, 1, 'sparkle');
        }
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 74 + v.age * 2.8, color: s.core, int: 1.4, life: 2, ml: 2 });
      state.shake(0.45);

      if (v.age > 14) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(980, 150, 'sine', 0.16, 0.12);
      }
      return;
    }

    if (v.state === 1) {
      // Confession beat before the bloom delivers its verdict.
      const pullR = s.bloomR * 0.92;
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = v.cx - ex;
        const dy = v.cy - ey;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > pullR) continue;

        const k = Math.max(0, 1 - dist / pullR);
        e.vx += (dx / dist) * (1.5 * k) / (e.mass || 1);
        e.vy += (dy / dist) * (1.15 * k) / (e.mass || 1) - 0.05;
        if (v.age % 4 === 0) hurtEntity(e, Math.max(1, Math.floor(s.dmg * 0.05 * k)), v.cx, v.cy);
      }

      for (const p of state.projectiles) {
        const dx = v.cx - p.x;
        const dy = v.cy - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > pullR * 1.1) continue;
        const k = Math.max(0, 1 - dist / (pullR * 1.1));
        p.vx += (dx / dist) * 0.22 * k;
        p.vy += (dy / dist) * 0.22 * k;
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const rr = 26 + Math.random() * (pullR * 0.8);
        const px = v.cx + Math.cos(a) * rr;
        const py = v.cy + Math.sin(a) * rr * 0.82;
        state.particles.push({
          x: px,
          y: py,
          vx: (v.cx - px) * 0.09,
          vy: (v.cy - py) * 0.09,
          life: 16,
          ml: 16,
          color: Math.random() > 0.5 ? s.core : s.c2,
          size: 1.6,
          grav: -0.01,
          type: 'trail',
        });
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: pullR * 0.9, color: s.c2, int: 1.7, life: 2, ml: 2 });
      state.shake(1.05);

      if (v.age > 10) {
        v.state = 2;
        v.age = 0;
      }
      return;
    }

    if (!v.detDone) {
      v.detDone = true;
      explode(v.cx, v.cy, s.bloomR, s.bloomForce, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.bloomR * 1.25, life: 13, maxLife: 13, color: s.core });
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.bloomR * 1.55, life: 18, maxLife: 18, color: s.c2 });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.bloomR * 1.6, color: '#ffffff', int: 3.2, life: 8, ml: 8 });
      SoundFX.playNoise(0.22, 0.11, 310, 'bandpass', 4);
      SoundFX.playSweep(1700, 220, 'sawtooth', 0.2, 0.14);

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = ex - v.cx;
        const dy = ey - v.cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > s.bloomR * 1.1) continue;
        const k = Math.max(0, 1 - dist / (s.bloomR * 1.1));
        e.vx += (dx / dist) * (10.5 * k) / (e.mass || 1);
        e.vy += (dy / dist) * (6.2 * k) / (e.mass || 1) - 0.9;
        if (k > 0.55) hurtEntity(e, Math.floor(s.dmg * 0.32 * k), v.cx, v.cy);
      }

      v.fragments = Array.from({ length: 16 }, (_, i) => ({
        a: (i / 16) * Math.PI * 2,
        len: 12 + Math.random() * 26,
        life: 16 + Math.floor(Math.random() * 8),
        ml: 24,
      }));
      state.shake(10);
    }

    for (let i = v.fragments.length - 1; i >= 0; i--) {
      v.fragments[i].life -= 1;
      if (v.fragments[i].life <= 0) v.fragments.splice(i, 1);
    }

    if (v.age > 16) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_cast_fault_bloom(v, X) {
    const s = v.spell;
    const det = v.state >= 2 ? Math.min(1, v.age / 16) : 0;

    X.save();
    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.16 + det * 0.15;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, 22 + v.age * 2.1, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.68;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    for (const p of v.petals || []) {
      const a = p.a + (v.age || 0) * 0.03;
      const x = Math.cos(a) * p.r;
      const y = Math.sin(a) * p.r * 0.82;
      X.beginPath();
      X.moveTo(0, 0);
      X.lineTo(x, y);
      X.stroke();

      X.globalAlpha = 0.36;
      X.fillStyle = Math.sin(a) > 0 ? s.c2 : s.color;
      X.beginPath();
      X.moveTo(x, y);
      X.lineTo(x - Math.cos(a + 0.7) * 7, y - Math.sin(a + 0.7) * 6);
      X.lineTo(x - Math.cos(a - 0.7) * 7, y - Math.sin(a - 0.7) * 6);
      X.closePath();
      X.fill();
      X.globalAlpha = 0.68;
    }

    drawEcholithSigil(X, 'threshold', 0, 0, 26 + det * 16, v.phase, {
      good: s.color,
      evil: s.c2,
      core: s.core,
    });

    if (v.state === 1) {
      X.globalAlpha = 0.4;
      X.strokeStyle = s.core;
      X.lineWidth = 1.1;
      X.setLineDash([5, 5]);
      X.lineDashOffset = -v.phase * 14;
      X.beginPath();
      X.ellipse(0, 0, s.bloomR * 0.74, s.bloomR * 0.52, v.phase * 0.2, 0, Math.PI * 2);
      X.stroke();
      X.setLineDash([]);
    }

    if (v.state >= 2) {
      drawEcholithHalo(X, -18, -8, 26 + det * 20, 10 + det * 6, v.phase, s.color, 0.45);
      drawEcholithHorns(X, 20, 10, 30 + det * 18, v.phase, s.c2, 0.45);
    }

    for (const f of v.fragments || []) {
      const alive = f.life / (f.ml || 24);
      X.globalAlpha = 0.9 * alive;
      X.strokeStyle = Math.random() > 0.5 ? s.core : s.c2;
      X.lineWidth = 1.2;
      const a = f.a + v.phase * 0.35;
      const len = f.len * (1 + det * 0.8);
      X.beginPath();
      X.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      X.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      X.stroke();
    }

    X.restore();
  },
};
