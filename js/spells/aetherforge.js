// ═══════════════════════════════════════════════════════════════════════════
// aetherforge.js — Aetherforge School (aggregator + ultimate)
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';

import {
  ALPHA_SPELL_DEFS,
  ALPHA_FIRE_HANDLERS,
  ALPHA_PROJ_HOOKS,
  ALPHA_TRAIL_EMITTERS,
  ALPHA_VFX_UPDATE,
  ALPHA_VFX_DRAW,
} from './aetherforge-slice-alpha.js?v=8';
import {
  BETA_SPELL_DEFS,
  BETA_FIRE_HANDLERS,
  BETA_PROJ_HOOKS,
  BETA_TRAIL_EMITTERS,
  BETA_VFX_UPDATE,
  BETA_VFX_DRAW,
} from './aetherforge-slice-beta.js?v=9';
import {
  GAMMA_SPELL_DEFS,
  GAMMA_FIRE_HANDLERS,
  GAMMA_PROJ_HOOKS,
  GAMMA_TRAIL_EMITTERS,
  GAMMA_VFX_UPDATE,
  GAMMA_VFX_DRAW,
} from './aetherforge-slice-gamma.js?v=8';

const ULTIMATE_SPELL = {
  name: 'Parallax Crucible',
  icon: '🜂',
  key: 'T',
  color: '#39f0ff',
  c2: '#ff78f6',
  core: '#ffffff',
  speed: 0,
  dmg: 95,
  mana: 95,
  cd: 9800,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'aether',
  isParallaxCrucible: true,
  crucibleR: 290,
  cruciblePull: 1.35,
  desc: 'Bends space-time into a radiant crucible, then collapses reality (Ultimate)',
};

export const SPELL_DEFS = [
  ...ALPHA_SPELL_DEFS,
  ...BETA_SPELL_DEFS,
  ...GAMMA_SPELL_DEFS,
  ULTIMATE_SPELL,
];

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function applyCrucibleField(v, radius, pullStrength, tickDmg = 0, frozenFrames = 0) {
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dx = v.cx - ex;
    const dy = v.cy - ey;
    const dist = Math.hypot(dx, dy);
    if (dist >= radius || dist < 4) continue;
    const t = 1 - dist / radius;
    const pull = pullStrength * t;
    e.vx += (dx / dist) * pull;
    e.vy += (dy / dist) * pull - pull * 0.05;
    if (frozenFrames > 0 && state.frozenEntities) {
      state.frozenEntities.set(e, Math.max(state.frozenEntities.get(e) || 0, frozenFrames));
    }
    if (tickDmg > 0 && v.age % 9 === 0) {
      hurtEntity(e, tickDmg, v.cx, v.cy);
    }
  }

  for (const p of state.projectiles) {
    const dx = v.cx - p.x;
    const dy = v.cy - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= radius || dist < 4) continue;
    const t = 1 - dist / radius;
    const pull = pullStrength * t * 0.62;
    p.vx += (dx / dist) * pull;
    p.vy += (dy / dist) * pull;
  }
}

function crucibleStrike(v, x, y, scale = 1) {
  const s = v.spell;
  const dmg = Math.floor(s.dmg * (0.22 + scale * 0.08));
  const blastR = 54 + 20 * scale;
  const force = 8 + 3 * scale;

  explode(x, y, blastR, force, dmg, s.color, s.c2);
  state.dynamicLights.push({ x, y, r: 120 + 40 * scale, color: s.core, int: 2.5, life: 7, ml: 7 });
  state.shockwaves.push({ x, y, r: 0, maxR: blastR * 1.5, life: 10, maxLife: 10, color: s.c2 });
  SoundFX.playSweep(1700, 260, 'sawtooth', 0.15 + scale * 0.03, 0.12);

  for (let k = 0; k < 26; k++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 6;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - Math.random() * 2.5,
      life: 24 + Math.floor(Math.random() * 20),
      ml: 44,
      color: k % 3 === 0 ? s.core : (k % 2 ? s.c2 : s.color),
      size: 2 + Math.random() * 3,
      grav: 0.08,
      type: 'sparkle',
    });
  }
}

export const FIRE_HANDLERS = {
  ...ALPHA_FIRE_HANDLERS,
  ...BETA_FIRE_HANDLERS,
  ...GAMMA_FIRE_HANDLERS,

  isParallaxCrucible(s, ox, oy, tx, ty) {
    const margin = 70;
    const cx = Math.max(margin, Math.min(state.W - margin, tx));
    const cy = Math.max(90, Math.min(state.H - margin, ty));

    state.vfxSequences.push({
      type: 'aetherforge_parallax_crucible',
      state: 0,
      age: 0,
      spell: s,
      cx,
      cy,
      ringPhase: Math.random() * Math.PI * 2,
      strikeQueue: [],
      marks: [],
      finalPulseDone: false,
      prevPlayerInv: !!state.player.inv,
    });

    state.player.inv = true;
    SoundFX.playSweep(130, 740, 'sine', 0.45, 0.55);
    SoundFX.playTone(95, 'triangle', 0.26, 0.65);
    state.shake(6);
    spawnP(cx, cy, s.c2, 18, 'burst');
    return true;
  },
};

export const PROJ_HOOKS = {
  ...ALPHA_PROJ_HOOKS,
  ...BETA_PROJ_HOOKS,
  ...GAMMA_PROJ_HOOKS,
};

export const TRAIL_EMITTERS = {
  ...ALPHA_TRAIL_EMITTERS,
  ...BETA_TRAIL_EMITTERS,
  ...GAMMA_TRAIL_EMITTERS,

  aether(p, s) {
    if (p.age % 2 !== 0) return;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      state.particles.push({
        x: p.x + Math.cos(a) * 4,
        y: p.y + Math.sin(a) * 4,
        vx: Math.cos(a) * 1.4,
        vy: Math.sin(a) * 1.4,
        life: 14,
        ml: 14,
        color: i === 0 ? s.c2 : s.core,
        size: 1.5 + Math.random() * 1.5,
        grav: 0,
        type: 'sparkle',
      });
    }
  },
};

export const VFX_UPDATE = {
  ...ALPHA_VFX_UPDATE,
  ...BETA_VFX_UPDATE,
  ...GAMMA_VFX_UPDATE,

  aetherforge_parallax_crucible(v) {
    const s = v.spell;
    v.ringPhase += 0.04;

    // Phase 0 — lock-in + telegraph
    if (v.state === 0) {
      if (v.age === 1) {
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 200, color: s.core, int: 1.8, life: 8, ml: 8 });
      }
      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * 46;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r, s.c2, 1, 'sparkle');
      }
      if (v.age % 6 === 0) {
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 40 + v.age * 2, life: 8, maxLife: 8, color: s.color });
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 96 + v.age * 2, color: s.c2, int: 0.8, life: 2, ml: 2 });
      if (v.age > 26) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(640, 120, 'square', 0.23, 0.22);
      }
      return;
    }

    // Phase 1 — gravity lens
    if (v.state === 1) {
      const prog = Math.min(1, v.age / 68);
      const radius = 90 + (s.crucibleR - 90) * prog;
      const pull = (s.cruciblePull || 1.2) * (0.65 + prog * 0.9);

      applyCrucibleField(v, radius, pull, 5, 22);
      state.shake(0.7 + prog);

      if (v.age % 8 === 0) {
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = radius * (0.35 + Math.random() * 0.65);
          spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r, k % 2 ? s.color : s.c2, 1, 'sparkle');
        }
      }

      if (v.age % 12 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = radius * (0.45 + Math.random() * 0.45);
        const mx = v.cx + Math.cos(a) * r;
        const my = v.cy + Math.sin(a) * r;
        v.marks.push({ x: mx, y: my, life: 18, maxLife: 18 });
        v.strikeQueue.push({ x: mx, y: my, t: 10 + Math.floor(Math.random() * 6), scale: 0.95 + Math.random() * 0.6 });
      }

      for (let i = v.strikeQueue.length - 1; i >= 0; i--) {
        const q = v.strikeQueue[i];
        q.t -= 1;
        if (q.t <= 0) {
          crucibleStrike(v, q.x, q.y, q.scale);
          v.strikeQueue.splice(i, 1);
        }
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: radius * 0.95, color: s.core, int: 1.4, life: 2, ml: 2 });
      if (v.age > 72) {
        v.state = 2;
        v.age = 0;
        v.strikeQueue = [];
        SoundFX.playSweep(300, 1600, 'triangle', 0.28, 0.2);
      }
      return;
    }

    // Phase 2 — shatter rain
    if (v.state === 2) {
      const ringR = s.crucibleR * 0.75;
      if (v.age % 6 === 0) {
        const a = (v.age * 0.31) + v.ringPhase;
        const sx = v.cx + Math.cos(a) * ringR;
        const sy = v.cy + Math.sin(a) * ringR * 0.58;
        v.strikeQueue.push({ x: sx, y: sy, t: 5, scale: 1.1 });
      }

      for (let i = v.strikeQueue.length - 1; i >= 0; i--) {
        const q = v.strikeQueue[i];
        q.t -= 1;
        if (q.t <= 0) {
          crucibleStrike(v, q.x, q.y, q.scale);
          v.strikeQueue.splice(i, 1);
        }
      }

      applyCrucibleField(v, s.crucibleR * 0.84, s.cruciblePull * 0.75, 0, 12);
      if (v.age % 2 === 0) state.shake(1.2);
      if (v.age > 46) {
        v.state = 3;
        v.age = 0;
        SoundFX.playNoise(0.85, 0.38, 120, 'lowpass');
      }
      return;
    }

    // Phase 3 — final collapse and afterglow
    if (!v.finalPulseDone) {
      v.finalPulseDone = true;
      explode(v.cx, v.cy, s.crucibleR, 22, s.dmg, s.color, s.c2);
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.crucibleR * 1.2, color: '#ffffff', int: 4.2, life: 7, ml: 7 });
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.crucibleR * 1.45, life: 18, maxLife: 18, color: s.core });
      SoundFX.playSweep(1800, 80, 'sawtooth', 0.35, 0.2);
      state.shake(22);

      // Rebound push.
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = ex - v.cx;
        const dy = ey - v.cy;
        const dist = Math.hypot(dx, dy);
        if (dist > s.crucibleR || dist < 4) continue;
        const t = 1 - dist / s.crucibleR;
        const push = 16 * t;
        e.vx += (dx / dist) * push;
        e.vy += (dy / dist) * push - 2;
      }
    }

    if (v.age % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (s.crucibleR * 0.8);
      spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r, Math.random() > 0.5 ? s.core : s.c2, 1, 'sparkle');
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.crucibleR * 0.9, color: s.c2, int: 1.2, life: 2, ml: 2 });

    if (v.age > 30) {
      if (!v.prevPlayerInv) state.player.inv = false;
      removeVfx(v);
    }
  },
};

export const VFX_DRAW = {
  ...ALPHA_VFX_DRAW,
  ...BETA_VFX_DRAW,
  ...GAMMA_VFX_DRAW,

  aetherforge_parallax_crucible(v, X) {
    const s = v.spell;
    const t = v.age;
    const baseR = v.state === 0 ? 26 + t * 2.8 : (v.state === 1 ? Math.min(s.crucibleR, 100 + t * 2.6) : s.crucibleR);

    X.save();
    X.translate(v.cx, v.cy);

    // Outer halo
    X.globalAlpha = 0.18;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, baseR * 0.95, 0, Math.PI * 2);
    X.fill();

    // Dual rotating rings.
    for (let layer = 0; layer < 2; layer++) {
      const rr = baseR * (0.62 + layer * 0.34);
      const spin = v.ringPhase * (layer === 0 ? 1.7 : -1.2);
      X.globalAlpha = 0.65 - layer * 0.2;
      X.strokeStyle = layer === 0 ? s.core : s.c2;
      X.lineWidth = layer === 0 ? 2.4 : 1.3;
      X.beginPath();
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        const wobble = Math.sin(a * 6 + spin) * (3 + layer * 2);
        const x = Math.cos(a + spin * 0.18) * (rr + wobble);
        const y = Math.sin(a - spin * 0.13) * ((rr + wobble) * (0.72 + layer * 0.1));
        if (i === 0) X.moveTo(x, y); else X.lineTo(x, y);
      }
      X.closePath();
      X.stroke();
    }

    // Accretion lines
    if (v.state >= 1 && v.state <= 2) {
      X.globalAlpha = 0.35;
      X.strokeStyle = s.c2;
      X.lineWidth = 1;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + v.ringPhase * 0.8;
        X.beginPath();
        X.moveTo(Math.cos(a) * baseR * 1.05, Math.sin(a) * baseR * 0.8);
        X.lineTo(Math.cos(a + 0.35) * baseR * 0.2, Math.sin(a + 0.35) * baseR * 0.15);
        X.stroke();
      }
    }

    // Telegraph markers for pending strikes.
    for (const m of v.marks || []) {
      const lifeT = m.life / m.maxLife;
      X.globalAlpha = 0.1 + 0.45 * lifeT;
      X.strokeStyle = s.core;
      X.lineWidth = 1.5;
      X.beginPath();
      X.arc(m.x - v.cx, m.y - v.cy, 8 + (1 - lifeT) * 14, 0, Math.PI * 2);
      X.stroke();
      m.life = Math.max(0, m.life - 1);
    }
    if (v.marks) v.marks = v.marks.filter((m) => m.life > 0);

    // Final whiteout pulse.
    if (v.state === 3) {
      X.globalAlpha = Math.max(0, 0.35 - t * 0.01);
      X.fillStyle = '#ffffff';
      X.beginPath();
      X.arc(0, 0, s.crucibleR * (0.4 + t * 0.03), 0, Math.PI * 2);
      X.fill();
    }

    X.restore();
  },
};
