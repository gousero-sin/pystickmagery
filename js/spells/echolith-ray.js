// echolith-ray.js — Echolith school spell (Ray)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { drawEcholithSigil } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Absolution Thorn',
  icon: '✦',
  key: '1',
  category: 'Ray',
  color: '#f4d36a',
  c2: '#8f0713',
  core: '#ffffff',
  speed: 17,
  dmg: 24,
  mana: 16,
  cd: 220,
  r: 3,
  grav: 0,
  drag: 0.999,
  bounce: 1,
  exR: 44,
  exF: 9,
  trail: 'echolith_ray',
  isEcholithRay: true,
  echolithSide: 'good',
  rayWarp: 0.42,
  rayAccel: 0.006,
  fractureDur: 24,
  desc: 'A white-gold thorn of mercy brands sinners, then blossoms into a halo verdict',
};

function sideVector(vx, vy) {
  const len = Math.hypot(vx, vy) || 1;
  return { x: -vy / len, y: vx / len };
}

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function makeShards(count, baseR) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    return {
      a,
      r: baseR * (0.32 + Math.random() * 0.48),
      len: 12 + Math.random() * 22,
      width: 1.2 + Math.random() * 2.2,
      drift: 0.012 + Math.random() * 0.02,
      off: Math.random() * Math.PI * 2,
    };
  });
}

export const FIRE_HANDLERS = {};

export const PROJ_HOOKS = {
  isEcholithRay: {
    onUpdate(p, s) {
      const speed = Math.hypot(p.vx, p.vy) || 1;
      p.vx *= 1 + (s.rayAccel || 0.005);
      p.vy *= 1 + (s.rayAccel || 0.005);

      // Mercy/damnation helix that reads as a premium cinematic beam while keeping aim reliable.
      const sv = sideVector(p.vx, p.vy);
      const wobbleA = Math.sin((p.age || 0) * 0.65) * (s.rayWarp || 0.42);
      const wobbleB = Math.sin((p.age || 0) * 0.21 + 2.1) * (s.rayWarp || 0.42) * 0.55;
      p.x += sv.x * (wobbleA + wobbleB);
      p.y += sv.y * (wobbleA + wobbleB);

      if ((p.age || 0) % 2 === 0) {
        spawnP(p.x + sv.x * 6, p.y + sv.y * 6, s.c2, 1, 'sparkle');
        spawnP(p.x - sv.x * 6, p.y - sv.y * 6, s.color, 1, 'trail');
      }

      if ((p.age || 0) % 6 === 0) {
        state.shockwaves.push({
          x: p.x,
          y: p.y,
          r: 0,
          maxR: 16 + Math.min(14, speed * 0.6),
          life: 5,
          maxLife: 5,
          color: s.c2,
        });
      }

      if ((p.age || 0) % 4 === 0) {
        state.dynamicLights.push({
          x: p.x,
          y: p.y,
          r: 28 + Math.min(20, speed * 0.85),
          color: s.core,
          int: 1.1,
          life: 3,
          ml: 3,
        });
      }
    },

    onLand(p, s) {
      explode(p.x, p.y, s.exR, s.exF, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: s.exR * 1.35, life: 10, maxLife: 10, color: s.core });
      state.dynamicLights.push({ x: p.x, y: p.y, r: s.exR * 2.2, color: s.core, int: 2.2, life: 7, ml: 7 });

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = ex - p.x;
        const dy = ey - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > s.exR * 1.25) continue;
        const k = Math.max(0, 1 - dist / (s.exR * 1.25));

        e.vx += (dx / dist) * (10 * k) / (e.mass || 1);
        e.vy += (dy / dist) * (6 * k) / (e.mass || 1) - 1.2;
        if (k > 0.45) hurtEntity(e, Math.floor(s.dmg * 0.35 * k), p.x, p.y);
      }

      state.vfxSequences.push({
        type: 'echolith_ray_fracture',
        state: 0,
        age: 0,
        spell: s,
        cx: p.x,
        cy: p.y,
        phase: Math.random() * Math.PI * 2,
        shards: makeShards(14, s.exR * 1.3),
        pulseDone: false,
      });

      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const v = 3 + Math.random() * 5;
        state.particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 24 + Math.floor(Math.random() * 16),
          ml: 40,
          color: i % 2 === 0 ? s.c2 : s.core,
          size: 2 + Math.random() * 2.5,
          grav: 0.06,
          type: 'sparkle',
        });
      }

      SoundFX.playSweep(1600, 210, 'sawtooth', 0.18, 0.1);
      SoundFX.playNoise(0.2, 0.12, 1500, 'bandpass', 5);
      state.shake(7);
      return true;
    },
  },
};

export const TRAIL_EMITTERS = {
  echolith_ray(p, s) {
    if ((p.age || 0) % 2 !== 0) return;
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 4,
      y: p.y + (Math.random() - 0.5) * 4,
      vx: -p.vx * 0.1 + (Math.random() - 0.5) * 0.4,
      vy: -p.vy * 0.1 + (Math.random() - 0.5) * 0.4,
      life: 16,
      ml: 16,
      color: Math.random() > 0.5 ? s.color : s.c2,
      size: 1 + Math.random() * 1.7,
      grav: 0,
      type: 'trail',
    });
  },
};

export const VFX_UPDATE = {
  echolith_ray_fracture(v) {
    const s = v.spell;
    v.phase += 0.24;

    if (v.age % 2 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * (s.exR * 0.9);
      spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
    }

    if (!v.pulseDone && v.age > 6) {
      v.pulseDone = true;
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.exR * 1.9, life: 8, maxLife: 8, color: s.c2 });
      SoundFX.playTone(980, 'triangle', 0.08, 0.08);
    }

    state.dynamicLights.push({
      x: v.cx,
      y: v.cy,
      r: s.exR * (1.2 + Math.sin(v.phase * 0.5) * 0.06),
      color: s.core,
      int: 0.9,
      life: 2,
      ml: 2,
    });

    if (v.age > (s.fractureDur || 24)) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_ray_fracture(v, X) {
    const s = v.spell;
    const a = 1 - v.age / (s.fractureDur || 24);

    X.save();
    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.2 * a;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, s.exR * (0.55 + (1 - a) * 0.55), 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.72 * a;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.ellipse(0, 0, s.exR * (0.88 + (1 - a) * 0.35), s.exR * 0.56, v.phase * 0.25, 0, Math.PI * 2);
    X.stroke();

    drawEcholithSigil(X, 'good', 0, -2, s.exR * 0.44, v.phase, { good: s.color, evil: s.c2, core: s.core });

    X.globalAlpha = 0.9 * a;
    for (const shard of v.shards || []) {
      const sa = shard.a + v.phase * shard.drift + Math.sin(v.phase + shard.off) * 0.08;
      const sx = Math.cos(sa) * shard.r;
      const sy = Math.sin(sa) * shard.r * 0.78;
      const ex = Math.cos(sa) * (shard.r + shard.len);
      const ey = Math.sin(sa) * (shard.r + shard.len) * 0.78;

      X.strokeStyle = Math.random() > 0.5 ? s.core : s.c2;
      X.lineWidth = shard.width;
      X.beginPath();
      X.moveTo(sx, sy);
      X.lineTo(ex, ey);
      X.stroke();
    }

    X.restore();
  },
};
