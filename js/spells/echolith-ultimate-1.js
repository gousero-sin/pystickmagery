// echolith-ultimate-1.js — Echolith school spell (Ultimate)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { drawEcholithHalo, drawEcholithSigil, drawEcholithWingPair } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Choir of Absolution',
  icon: '☀',
  key: '8',
  category: 'Ultimate',
  color: '#f4d36a',
  c2: '#fff4b8',
  core: '#ffffff',
  speed: 0,
  dmg: 92,
  mana: 86,
  cd: 9000,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithUltimate1: true,
  echolithSide: 'good',
  fieldR: 300,
  pull: 1.3,
  desc: 'A divine choir lowers halos and saint pillars before a final absolution smites the arena (Ultimate)',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function applyField(v, r, pull, swirl = 0, tickDmg = 0) {
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dx = v.cx - ex;
    const dy = v.cy - ey;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > r) continue;
    const k = Math.max(0, 1 - dist / r);

    const tx = -dy / dist;
    const ty = dx / dist;
    e.vx += (dx / dist) * pull * k + tx * swirl * k;
    e.vy += (dy / dist) * pull * k + ty * swirl * k - 0.15;

    if (tickDmg > 0 && v.age % 9 === 0) hurtEntity(e, tickDmg, v.cx, v.cy);
  }
}

function spawnQueuedImpact(v, x, y, delay) {
  v.queued.push({ x, y, t: delay, done: false });
}

function createPillars(count, radius) {
  return Array.from({ length: count }, (_, i) => ({
    a: (i / count) * Math.PI * 2,
    h: 90 + Math.random() * 46,
    wobble: Math.random() * Math.PI * 2,
    r: radius * (0.62 + Math.random() * 0.23),
  }));
}

export const FIRE_HANDLERS = {
  isEcholithUltimate1(s, ox, oy, tx, ty) {
    const margin = 66;
    const cx = Math.max(margin, Math.min(state.W - margin, tx));
    const cy = Math.max(84, Math.min(state.H - margin, ty));

    state.vfxSequences.push({
      type: 'echolith_ultimate_cathedral',
      state: 0,
      age: 0,
      spell: s,
      cx,
      cy,
      phase: Math.random() * Math.PI * 2,
      queued: [],
      cracks: [],
      ringPulse: [],
      pillars: createPillars(7, s.fieldR),
      prevInv: !!state.player.inv,
      exploded: false,
    });

    state.player.inv = true;
    SoundFX.playSweep(100, 620, 'sine', 0.42, 0.55);
    state.shake(5);
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_ultimate_cathedral(v) {
    const s = v.spell;
    v.phase += 0.05;

    for (let i = v.ringPulse.length - 1; i >= 0; i--) {
      const rp = v.ringPulse[i];
      rp.r += rp.maxR / rp.maxLife;
      rp.life -= 1;
      if (rp.life <= 0) v.ringPulse.splice(i, 1);
    }

    if (v.state === 0) {
      // Invocation: saint pillars descend and establish the absolution field.
      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 86;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.78, s.c2, 1, 'sparkle');
      }
      if (v.age % 6 === 0) {
        v.ringPulse.push({ r: 0, maxR: 58 + v.age * 3.5, life: 9, maxLife: 9 });
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 120 + v.age * 2.6, color: s.core, int: 1.0, life: 2, ml: 2 });
      state.shake(0.75);

      if (v.age > 32) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(620, 180, 'square', 0.22, 0.16);
      }
      return;
    }

    if (v.state === 1) {
      // Confinement choir: sustained pull with rotating pillars and staggered smites.
      const prog = Math.min(1, v.age / 78);
      const r = 110 + (s.fieldR - 110) * prog;
      applyField(v, r, s.pull * (0.7 + prog), 0.22 + prog * 0.3, 4);

      if (v.age % 9 === 0) {
        const a = Math.random() * Math.PI * 2;
        const rr = r * (0.4 + Math.random() * 0.52);
        spawnQueuedImpact(v, v.cx + Math.cos(a) * rr, v.cy + Math.sin(a) * rr * 0.78, 8 + Math.floor(Math.random() * 8));
      }

      if (v.age % 8 === 0) {
        v.ringPulse.push({ r: 0, maxR: r * 1.05, life: 10, maxLife: 10 });
      }

      for (let i = v.queued.length - 1; i >= 0; i--) {
        const q = v.queued[i];
        q.t -= 1;
        if (q.t <= 0 && !q.done) {
          q.done = true;
          explode(q.x, q.y, 52, 8, Math.floor(s.dmg * 0.22), s.color, s.c2);
          v.cracks.push({ x: q.x, y: q.y, life: 16, ml: 16, a: Math.random() * Math.PI * 2 });
          v.queued.splice(i, 1);
        }
      }

      for (let i = v.cracks.length - 1; i >= 0; i--) {
        v.cracks[i].life -= 1;
        if (v.cracks[i].life <= 0) v.cracks.splice(i, 1);
      }

      state.shake(0.8 + prog * 0.9);
      state.dynamicLights.push({ x: v.cx, y: v.cy, r, color: s.core, int: 1.2, life: 2, ml: 2 });

      if (v.age > 78) {
        v.state = 2;
        v.age = 0;
        SoundFX.playSweep(140, 980, 'triangle', 0.18, 0.2);
      }
      return;
    }

    if (v.state === 2) {
      // Absolution slam: radius shrinks while ceiling strikes accelerate.
      const shrink = Math.max(0.32, 1 - v.age / 24);
      applyField(v, s.fieldR * shrink, s.pull * 2.2, 0.08, 6);

      if (v.age % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        const rr = s.fieldR * shrink * (0.55 + Math.random() * 0.35);
        spawnQueuedImpact(v, v.cx + Math.cos(a) * rr, v.cy + Math.sin(a) * rr * 0.78, 3 + Math.floor(Math.random() * 3));
      }

      for (let i = v.queued.length - 1; i >= 0; i--) {
        const q = v.queued[i];
        q.t -= 1;
        if (q.t <= 0) {
          explode(q.x, q.y, 46, 7, Math.floor(s.dmg * 0.18), s.color, s.c2);
          v.queued.splice(i, 1);
        }
      }

      state.dynamicLights.push({
        x: v.cx,
        y: v.cy,
        r: s.fieldR * (0.7 + shrink * 0.45),
        color: s.c2,
        int: 1.65,
        life: 2,
        ml: 2,
      });
      state.shake(1.6);

      if (v.age > 22) {
        v.state = 3;
        v.age = 0;
      }
      return;
    }

    if (!v.exploded) {
      v.exploded = true;
      explode(v.cx, v.cy, s.fieldR, 22, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.fieldR * 1.5, life: 18, maxLife: 18, color: s.core });
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.fieldR * 1.9, life: 24, maxLife: 24, color: s.c2 });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.fieldR * 1.35, color: '#ffffff', int: 4.4, life: 10, ml: 10 });

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = ex - v.cx;
        const dy = ey - v.cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > s.fieldR) continue;
        const k = Math.max(0, 1 - dist / s.fieldR);
        e.vx += (dx / dist) * 20 * k / (e.mass || 1);
        e.vy += (dy / dist) * 12 * k / (e.mass || 1) - 2;
      }

      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const sp = 4 + Math.random() * 9;
        state.particles.push({
          x: v.cx,
          y: v.cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 24 + Math.floor(Math.random() * 22),
          ml: 44,
          color: i % 3 === 0 ? s.core : (i % 2 ? s.c2 : s.color),
          size: 2 + Math.random() * 2.5,
          grav: 0.06,
          type: 'sparkle',
        });
      }

      SoundFX.playSweep(1900, 80, 'sawtooth', 0.34, 0.2);
      state.shake(24);
    }

    if (v.age === 10 || v.age === 18) {
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.fieldR * (1.2 + v.age * 0.02), life: 12, maxLife: 12, color: s.core });
    }

    if (v.age > 44) {
      if (!v.prevInv) state.player.inv = false;
      removeVfx(v);
    }
  },
};

export const VFX_DRAW = {
  echolith_ultimate_cathedral(v, X) {
    const s = v.spell;
    const p = v.phase || 0;

    const baseR = v.state === 0
      ? 40 + v.age * 3.8
      : v.state === 1
        ? Math.min(s.fieldR, 110 + v.age * 2.45)
        : v.state === 2
          ? s.fieldR * Math.max(0.35, 1 - v.age / 24)
          : s.fieldR;

    X.save();

    // Arena veil: sell cinematic ritual scale.
    X.globalAlpha = v.state < 3 ? 0.08 : 0.16;
    X.fillStyle = '#b8d6ff';
    X.fillRect(0, 0, state.W, state.H);

    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.14;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, baseR * 0.92, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.75;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    for (let i = 0; i <= 84; i++) {
      const a = (i / 84) * Math.PI * 2;
      const w = Math.sin(a * 6 + p) * 7;
      const x = Math.cos(a) * (baseR + w);
      const y = Math.sin(a) * (baseR + w) * 0.74;
      if (i === 0) X.moveTo(x, y); else X.lineTo(x, y);
    }
    X.closePath();
    X.stroke();

    X.globalAlpha = 0.34;
    X.strokeStyle = s.core;
    X.lineWidth = 1.2;
    X.beginPath();
    X.ellipse(0, 0, baseR * 0.62, baseR * 0.42, -p * 0.3, 0, Math.PI * 2);
    X.stroke();

    drawEcholithSigil(X, 'good', 0, 0, baseR * 0.2, p, { good: s.color, evil: '#8f0713', core: s.core });
    drawEcholithHalo(X, 0, -baseR * 0.28, baseR * 0.32, baseR * 0.08, p, s.color, 0.34);

    // Saint pillars orbiting the ritual edge.
    for (const col of v.pillars || []) {
      const a = col.a + p * 0.18;
      const h = col.h + Math.sin(p + col.wobble) * 9;
      const x = Math.cos(a) * col.r;
      const y = Math.sin(a) * col.r * 0.74;
      X.globalAlpha = 0.42;
      X.strokeStyle = s.core;
      X.lineWidth = 1.6;
      X.beginPath();
      X.moveTo(x, y + 12);
      X.lineTo(x, y - h);
      X.stroke();

      drawEcholithHalo(X, x, y - h - 8, 14, 5, p + col.wobble, s.color, 0.34);
      drawEcholithWingPair(X, x, y - h * 0.42, 18, p + col.wobble, s.core, 0.22);
    }

    for (const rp of v.ringPulse || []) {
      const a = rp.life / rp.maxLife;
      X.globalAlpha = 0.24 * a;
      X.strokeStyle = s.c2;
      X.lineWidth = 1.6;
      X.beginPath();
      X.ellipse(0, 0, rp.r, rp.r * 0.72, p * 0.12, 0, Math.PI * 2);
      X.stroke();
    }

    for (const c of v.cracks || []) {
      const a = c.life / c.ml;
      X.globalAlpha = 0.6 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 1.3;
      X.beginPath();
      X.moveTo(c.x - v.cx, c.y - v.cy);
      X.lineTo(c.x - v.cx + Math.cos(c.a) * 22, c.y - v.cy + Math.sin(c.a) * 16);
      X.stroke();
    }

    X.restore();
  },
};
