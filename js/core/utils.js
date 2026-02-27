// ═══════════════════════════════════════════════════════
// utils.js — Shared utility functions
//
// All functions receive `state` so they remain pure
// (no hidden globals) and are easily testable.
// ═══════════════════════════════════════════════════════

import { state } from './state.js';

// ─── Particle spawner ─────────────────────────────────
const PARTICLE_PRESETS = {
  burst: { vMul: 4, life: 30, size: 3, grav: 0.15 },
  explode: { vMul: 6, life: 55, size: 4, grav: 0.18 },
  trail: { vMul: 1.5, life: 15, size: 2, grav: 0.05 },
  sparkle: { vMul: 2, life: 40, size: 2, grav: -0.02 },
  void: { vMul: 2, life: 20, size: 2, grav: -0.05 },
  smoke: { vMul: 1, life: 50, size: 5, grav: -0.04 },
  dust: { vMul: 1.5, life: 35, size: 3, grav: 0.05 },
  cloud: { vMul: 0.8, life: 60, size: 6, grav: -0.03 },
  ember: { vMul: 2, life: 45, size: 2, grav: 0.06 },
};

export function spawnP(x, y, color, count = 1, type = 'burst') {
  const p = PARTICLE_PRESETS[type] || PARTICLE_PRESETS.burst;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = (0.5 + Math.random()) * p.vMul;
    state.particles.push({
      x: x + (Math.random() - .5) * 4,
      y: y + (Math.random() - .5) * 4,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: p.life + Math.random() * p.life * .5 | 0,
      ml: p.life,
      color, size: p.size + Math.random() * 2,
      grav: p.grav, type,
      rot: Math.random() * 6.28,
      rotV: (Math.random() - .5) * .2,
    });
  }
}

// ─── Damage ───────────────────────────────────────────
export function hurtEntity(e, dmg, fx, fy) {
  e.hp -= dmg; e.hitF = 180;
  state.damageNumbers = state.damageNumbers || [];
  state.damageNumbers.push({
    x: e.x + e.w / 2, y: e.y - 8,
    val: dmg, life: 70, vy: -2,
    color: '#ff4444', sc: 1 + dmg / 30,
  });
  if (e.hp <= 0) {
    e.active = false;
    spawnP(e.x + e.w / 2, e.y + e.h / 2, '#aaa', 25, 'explode');
    if (e.explosive) explode(e.x + e.w / 2, e.y + e.h / 2, 60, 11, 28, '#ff6600', '#ffaa33');
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: e.x + Math.random() * e.w, y: e.y + Math.random() * e.h,
        vx: (Math.random() - .5) * 5, vy: -Math.random() * 6 - 2,
        life: 90, ml: 90,
        color: e.type === 'crate' ? '#8B6914' : e.type === 'barrel' ? '#884422' : '#666',
        size: 3 + Math.random() * 4, grav: .18, type: 'debris',
        rot: Math.random() * 6, rotV: (Math.random() - .5) * .4,
      });
    }
  }
}

// ─── Explosion ────────────────────────────────────────
export function explode(x, y, radius, force, dmg, c1, c2) {
  spawnP(x, y, c1, 20, 'explode');
  spawnP(x, y, c2, 12, 'burst');
  state.shockwaves.push({ x, y, r: 0, maxR: radius, life: 20, maxLife: 20, color: c1 });
  state.dynamicLights.push({ x, y, r: radius * 1.5, color: c1, int: 2, life: 12, ml: 12 });
  state.shake(Math.min(radius / 8, 15));
  for (const e of state.entities) {
    if (!e.active) continue;
    const d = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
    if (d < radius) {
      const pct = 1 - d / radius;
      hurtEntity(e, Math.floor(dmg * pct), x, y);
      const a = Math.atan2(e.y + e.h / 2 - y, e.x + e.w / 2 - x);
      e.vx += Math.cos(a) * force * pct / (e.mass || 1);
      e.vy += Math.sin(a) * force * pct / (e.mass || 1) - 2;
    }
  }
}

// ─── Math helpers ─────────────────────────────────────
export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
