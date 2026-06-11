// revamp-helpers.js — shared helpers for compact school revamp modules.
import { state } from '../core/state.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';

export function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

export function playerCenter(fallbackX = 0, fallbackY = 0) {
  const p = state.player;
  if (!p) return { x: fallbackX, y: fallbackY };
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

export function bodyCenter(e) {
  return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function enemiesInRadius(x, y, radius) {
  return state.entities.filter((e) => {
    if (!isEnemyEntity(e)) return false;
    const c = bodyCenter(e);
    return Math.hypot(c.x - x, c.y - y) <= radius;
  });
}

export function damageEnemiesInRadius(x, y, radius, dmg, force = 0, color = '#ffffff', hitSet = null) {
  let hits = 0;
  for (const e of enemiesInRadius(x, y, radius)) {
    if (hitSet?.has(e)) continue;
    const c = bodyCenter(e);
    const d = Math.hypot(c.x - x, c.y - y) || 1;
    const pct = Math.max(0.2, 1 - d / radius);
    hurtEntity(e, Math.max(1, Math.round(dmg * pct)), x, y);
    if (force) {
      const mass = e.mass || 1;
      e.vx += ((c.x - x) / d) * force * pct / mass;
      e.vy += ((c.y - y) / d) * force * pct / mass - 0.9;
    }
    if (hitSet) hitSet.add(e);
    spawnP(c.x, c.y, color, 5, 'sparkle');
    hits++;
  }
  return hits;
}

export function healPlayer(amount, color = '#ffffff') {
  const p = state.player;
  if (!p || amount <= 0) return;
  const maxHp = p.maxHp || 100;
  const before = p.hp ?? maxHp;
  p.hp = Math.min(maxHp, before + amount);
  if (p.hp > before) {
    const c = playerCenter();
    spawnP(c.x, c.y - 10, color, 2, 'sparkle');
  }
}

export function nearestEnemyOrPoint(x, y, maxDist = 360) {
  const e = nearestEnemyEntity(x, y, maxDist);
  return e ? { ...bodyCenter(e), entity: e } : { x, y, entity: null };
}

export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy || 1;
  const t = clamp(((px - x1) * vx + (py - y1) * vy) / len2, 0, 1);
  const lx = x1 + vx * t;
  const ly = y1 + vy * t;
  return { dist: Math.hypot(px - lx, py - ly), x: lx, y: ly, t };
}

export function damageEnemiesAlongSegment(x1, y1, x2, y2, width, dmg, force, color, hitSet = null) {
  let hits = 0;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    if (hitSet?.has(e)) continue;
    const c = bodyCenter(e);
    const d = distanceToSegment(c.x, c.y, x1, y1, x2, y2);
    if (d.dist > width) continue;
    hurtEntity(e, dmg, d.x, d.y);
    if (force) {
      const nx = c.x - d.x;
      const ny = c.y - d.y;
      const len = Math.hypot(nx, ny) || 1;
      const mass = e.mass || 1;
      e.vx += (nx / len) * force / mass;
      e.vy += (ny / len) * force / mass - 0.7;
    }
    if (hitSet) hitSet.add(e);
    spawnP(c.x, c.y, color, 6, 'burst');
    hits++;
  }
  return hits;
}

export function pushLightningBolt(x1, y1, x2, y2, color, width = 2, steps = 7, jitter = 18) {
  const segments = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    segments.push({
      x: lerp(x1, x2, t) + (i > 0 && i < steps ? (Math.random() - 0.5) * jitter : 0),
      y: lerp(y1, y2, t) + (i > 0 && i < steps ? (Math.random() - 0.5) * jitter : 0),
    });
  }
  state.lightningBolts.push({ segments, life: 12, color, width });
}

export function drawRing(X, x, y, radius, color, alpha = 1, width = 2) {
  X.save();
  X.globalAlpha = alpha;
  X.strokeStyle = color;
  X.lineWidth = width;
  X.beginPath();
  X.arc(x, y, radius, 0, Math.PI * 2);
  X.stroke();
  X.restore();
}

export function drawBlade(X, x1, y1, x2, y2, width, color, core = '#ffffff', alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  X.globalAlpha = alpha;
  X.lineCap = 'round';
  X.strokeStyle = color;
  X.lineWidth = width;
  X.beginPath();
  X.moveTo(x1, y1);
  X.lineTo(x2, y2);
  X.stroke();
  X.strokeStyle = core;
  X.lineWidth = Math.max(1, width * 0.32);
  X.beginPath();
  X.moveTo(x1, y1);
  X.lineTo(x2, y2);
  X.stroke();
  X.restore();
}
