// echolith-ultimate-2.js — Echolith school spell (Ultimate adicional)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { drawEcholithHorns, drawEcholithSigil, drawEcholithStar } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Black Mass: Abyss Bell',
  icon: '⛧',
  key: '9',
  category: 'Ultimate (Adicional)',
  color: '#8f0713',
  c2: '#ff3b29',
  core: '#ffd0a3',
  speed: 0,
  dmg: 120,
  mana: 95,
  cd: 11000,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithUltimate2: true,
  echolithSide: 'evil',
  muteDur: 190,
  desc: 'Begin an infernal black mass: silence souls, harvest sin, and ring the abyss into final damnation (Ultimate)',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function dampStoreEntity(v, e, factor, storeFactor) {
  if (!v.stored.has(e)) v.stored.set(e, { vx: 0, vy: 0 });
  const bag = v.stored.get(e);
  bag.vx += e.vx * storeFactor;
  bag.vy += e.vy * storeFactor;
  e.vx *= factor;
  e.vy *= factor;
}

function dampStoreProjectile(v, p, factor, storeFactor) {
  if (!v.storedProj.has(p)) v.storedProj.set(p, { vx: 0, vy: 0 });
  const bag = v.storedProj.get(p);
  bag.vx += p.vx * storeFactor;
  bag.vy += p.vy * storeFactor;
  p.vx *= factor;
  p.vy *= factor;
}

export const FIRE_HANDLERS = {
  isEcholithUltimate2(s) {
    const cx = state.W * 0.5;
    const cy = state.H * 0.48;

    state.vfxSequences.push({
      type: 'echolith_ultimate_world_mute',
      state: 0,
      age: 0,
      spell: s,
      cx,
      cy,
      phase: Math.random() * Math.PI * 2,
      prevInv: !!state.player.inv,
      stored: new Map(),
      storedProj: new Map(),
      pulse: [],
      muteR: 60,
      exploded: false,
    });

    state.player.inv = true;
    SoundFX.playTone(82, 'sine', 0.35, 0.45);
    SoundFX.playSweep(2200, 160, 'triangle', 0.18, 0.45);
    state.shake(7);
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_ultimate_world_mute(v) {
    const s = v.spell;
    v.phase += 0.035;

    for (let i = v.pulse.length - 1; i >= 0; i--) {
      const p = v.pulse[i];
      p.r += p.maxR / p.maxLife;
      p.life -= 1;
      if (p.life <= 0) v.pulse.splice(i, 1);
    }

    if (v.state === 0) {
      // Silence spread: the arena gets enveloped before the black mass locks in.
      v.muteR = Math.min(430, 60 + v.age * 9.5);

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const d = Math.hypot(ex - v.cx, ey - v.cy);
        if (d > v.muteR) continue;
        dampStoreEntity(v, e, 0.8, 0.3);
      }

      for (const p of state.projectiles) {
        const d = Math.hypot(p.x - v.cx, p.y - v.cy);
        if (d > v.muteR * 1.1) continue;
        dampStoreProjectile(v, p, 0.82, 0.28);
      }

      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * v.muteR;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.68, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
      }

      if (v.age % 10 === 0) {
        v.pulse.push({ r: 0, maxR: v.muteR, life: 14, maxLife: 14 });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: Math.min(300, v.muteR * 0.9), life: 10, maxLife: 10, color: s.color });
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: v.muteR, color: s.core, int: 1.25, life: 2, ml: 2 });
      state.shake(0.85);

      if (v.age > 40) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(1800, 220, 'sine', 0.14, 0.22);
      }
      return;
    }

    if (v.state === 1) {
      // Hard harvest: almost no movement while sin is stored aggressively.
      for (const e of state.entities) {
        if (!e.active) continue;
        dampStoreEntity(v, e, 0.7, 0.42);
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = v.cx - ex;
        const dy = v.cy - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, 1 - dist / 420);
        e.vx += (dx / dist) * (0.42 * k) / (e.mass || 1);
        e.vy += (dy / dist) * (0.28 * k) / (e.mass || 1);
        if (v.age % 18 === 0) hurtEntity(e, 3, v.cx, v.cy);
      }

      for (const p of state.projectiles) {
        dampStoreProjectile(v, p, 0.72, 0.42);
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 70 + Math.random() * 280;
        const px = v.cx + Math.cos(a) * r;
        const py = v.cy + Math.sin(a) * r * 0.65;
        state.particles.push({
          x: px,
          y: py,
          vx: (v.cx - px) * 0.03,
          vy: (v.cy - py) * 0.03,
          life: 18,
          ml: 18,
          color: Math.random() > 0.5 ? s.core : s.c2,
          size: 1.5,
          grav: -0.01,
          type: 'trail',
        });
      }

      if (v.age % 12 === 0) {
        v.pulse.push({ r: 0, maxR: 340, life: 16, maxLife: 16 });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 260, life: 10, maxLife: 10, color: s.color });
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 260, color: s.core, int: 1.35, life: 2, ml: 2 });
      state.shake(0.7);

      if (v.age > s.muteDur) {
        v.state = 2;
        v.age = 0;
        SoundFX.playSweep(90, 2600, 'sawtooth', 0.34, 0.16);
      }
      return;
    }

    if (v.state === 2) {
      // Reversal wind-up: compress for one final abyss bell frame.
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = v.cx - ex;
        const dy = v.cy - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, 1 - dist / 420);
        e.vx += (dx / dist) * (1.15 * k) / (e.mass || 1);
        e.vy += (dy / dist) * (0.9 * k) / (e.mass || 1);
      }

      for (const p of state.projectiles) {
        const dx = v.cx - p.x;
        const dy = v.cy - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, 1 - dist / 460);
        p.vx += (dx / dist) * 0.55 * k;
        p.vy += (dy / dist) * 0.55 * k;
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 24 + Math.random() * 120;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.68, s.core, 1, 'sparkle');
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 180, color: '#ffffff', int: 1.9, life: 2, ml: 2 });
      state.shake(1.45);

      if (v.age > 26) {
        v.state = 3;
        v.age = 0;
      }
      return;
    }

    if (!v.exploded) {
      v.exploded = true;
      explode(v.cx, v.cy, 420, 28, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 520, life: 22, maxLife: 22, color: s.core });
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 640, life: 28, maxLife: 28, color: '#ffffff' });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 560, color: '#ffffff', int: 5.8, life: 10, ml: 10 });
      state.shake(30);

      // Release the stored sin with amplification for gigantic ragdoll aftermath.
      for (const [e, bag] of v.stored.entries()) {
        if (!e.active) continue;
        e.vx += bag.vx * 2.05 + (Math.random() - 0.5) * 4.2;
        e.vy += bag.vy * 1.9 - 2.4 - Math.random() * 2;
        hurtEntity(e, 20, v.cx, v.cy);
      }

      for (const [p, bag] of v.storedProj.entries()) {
        if (!state.projectiles.includes(p)) continue;
        p.vx += bag.vx * 2 + (Math.random() - 0.5) * 1.4;
        p.vy += bag.vy * 2 + (Math.random() - 0.5) * 1.4;
      }

      for (let i = 0; i < 76; i++) {
        const a = (i / 76) * Math.PI * 2;
        const spd = 4 + Math.random() * 9;
        state.particles.push({
          x: v.cx,
          y: v.cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 26 + Math.floor(Math.random() * 18),
          ml: 44,
          color: i % 3 === 0 ? s.core : (i % 2 ? s.c2 : s.color),
          size: 2 + Math.random() * 3,
          grav: 0.05,
          type: 'sparkle',
        });
      }
    }

    if (v.age === 8 || v.age === 16) {
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 380 + v.age * 8, life: 14, maxLife: 14, color: s.c2 });
    }

    if (v.age > 42) {
      if (!v.prevInv) state.player.inv = false;
      removeVfx(v);
    }
  },
};

export const VFX_DRAW = {
  echolith_ultimate_world_mute(v, X) {
    const s = v.spell;

    X.save();

    // Screen-space black-mass veil: cinematic damnation haze.
    X.globalAlpha = v.state <= 1 ? 0.12 : 0.2;
    X.fillStyle = '#2a0207';
    X.fillRect(0, 0, state.W, state.H);

    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.2;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, 150 + Math.sin(v.phase * 0.8) * 18, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.84;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.ellipse(0, 0, 220, 140, v.phase * 0.22, 0, Math.PI * 2);
    X.stroke();

    X.globalAlpha = 0.4;
    X.strokeStyle = s.core;
    X.lineWidth = 1.2;
    X.setLineDash([7, 6]);
    X.lineDashOffset = -v.phase * 12;
    X.beginPath();
    X.ellipse(0, 0, 280, 176, -v.phase * 0.18, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);

    drawEcholithSigil(X, 'evil', 0, 2, 92, v.phase, { good: '#fff4b8', evil: s.c2, core: s.core });
    drawEcholithStar(X, 0, 0, 124, v.phase, s.c2, 0.3);

    for (const p of v.pulse || []) {
      const a = p.life / p.maxLife;
      X.globalAlpha = 0.24 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 2;
      X.beginPath();
      X.ellipse(0, 0, p.r, p.r * 0.62, v.phase * 0.18, 0, Math.PI * 2);
      X.stroke();
    }

    // Bell ribs around center.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + v.phase * 0.1;
      const r1 = 18;
      const r2 = 120 + Math.sin(v.phase + i) * 12;
      X.globalAlpha = 0.32;
      X.strokeStyle = i % 2 ? s.c2 : s.core;
      X.lineWidth = 1.1;
      X.beginPath();
      X.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.62);
      X.lineTo(Math.cos(a) * r2, Math.sin(a) * r2 * 0.62);
      X.stroke();
    }

    drawEcholithHorns(X, 0, -24, 96, v.phase, s.c2, 0.38);

    if (v.state >= 2) {
      X.globalAlpha = 0.34;
      X.fillStyle = '#ffffff';
      X.beginPath();
      X.arc(0, 0, 24 + Math.sin(v.phase * 1.8) * 4, 0, Math.PI * 2);
      X.fill();
    }

    X.restore();
  },
};
