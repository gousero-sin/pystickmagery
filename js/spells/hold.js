import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';

const DEFAULT_KEY = 'A';

function removeVfx(vfx) {
  const idx = state.vfxSequences.indexOf(vfx);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clampScenePoint(x, y, pad = 24) {
  return {
    x: Math.max(pad, Math.min(state.W - pad, x)),
    y: Math.max(pad, Math.min(state.H - pad, y)),
  };
}

function casterOrigin() {
  return {
    x: state.player.x + state.player.w / 2 + state.player.facing * 10,
    y: state.player.y + 8,
  };
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return {
    t,
    x: cx,
    y: cy,
    dist: Math.hypot(px - cx, py - cy),
  };
}

function pushLight(x, y, r, color, int = 1, life = 4) {
  state.dynamicLights.push({ x, y, r, color, int, life, ml: life });
}

function buildLightning(x1, y1, x2, y2, color, width = 2) {
  const segments = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    segments.push({
      x: x1 + (x2 - x1) * t + (i > 0 && i < steps ? (Math.random() - 0.5) * 22 : 0),
      y: y1 + (y2 - y1) * t + (i > 0 && i < steps ? (Math.random() - 0.5) * 22 : 0),
    });
  }
  state.lightningBolts.push({ segments, life: 10, color, width });
}

function startSound(spell) {
  switch (spell.holdStyle) {
    case 'nature':
      SoundFX.playNoise(0.18, 0.22, 180, 'lowpass');
      SoundFX.playTone(160, 'square', 0.08, 0.1);
      break;
    case 'wind':
      SoundFX.playNoise(0.2, 0.12, 980, 'bandpass', 5);
      break;
    case 'fire':
      SoundFX.playNoise(0.22, 0.22, 260, 'lowpass');
      SoundFX.playSweep(180, 70, 'sawtooth', 0.16, 0.12);
      break;
    case 'water':
      SoundFX.playSweep(480, 980, 'triangle', 0.12, 0.12);
      break;
    case 'lightning':
      SoundFX.playTone(1200, 'sawtooth', 0.08, 0.1);
      break;
    case 'arcane':
      SoundFX.playSweep(420, 820, 'square', 0.1, 0.1);
      break;
    case 'void':
      SoundFX.playSweep(120, 36, 'sine', 0.2, 0.14);
      break;
    case 'holy':
      SoundFX.playTone(760, 'sine', 0.08, 0.1);
      break;
    case 'chrono':
      SoundFX.playTone(520, 'triangle', 0.08, 0.1);
      break;
    case 'celestial':
      SoundFX.playSweep(220, 880, 'sine', 0.12, 0.12);
      break;
    case 'cinema':
      SoundFX.playNoise(0.16, 0.1, 340, 'lowpass');
      SoundFX.playTone(560, 'triangle', 0.05, 0.08);
      break;
    case 'aetherforge':
      SoundFX.playNoise(0.2, 0.16, 320, 'bandpass', 4);
      SoundFX.playSweep(120, 760, 'sawtooth', 0.14, 0.11);
      break;
    default:
      SoundFX.playSweep(600, 900, 'triangle', 0.08, 0.08);
      break;
  }
}

function releaseSound(spell) {
  switch (spell.holdStyle) {
    case 'lightning':
      SoundFX.playSweep(1800, 420, 'sawtooth', 0.12, 0.12);
      break;
    case 'void':
      SoundFX.playSweep(80, 260, 'sine', 0.15, 0.16);
      break;
    case 'cinema':
      SoundFX.playSweep(100, 1400, 'triangle', 0.14, 0.12);
      break;
    case 'aetherforge':
      SoundFX.playSweep(90, 1800, 'square', 0.18, 0.14);
      SoundFX.playNoise(0.16, 0.08, 420, 'bandpass', 6);
      break;
    default:
      SoundFX.playSweep(320, 760, 'triangle', 0.1, 0.1);
      break;
  }
}

function holdAngle(v) {
  return Math.atan2(v.cy - v.oy, v.cx - v.ox);
}

function keepChannelPose() {
  state.player.castAnim = 280;
  state.player.castType = 'channel';
  state.player.staffGlow = 250;
  state.player.sq = 1.12;
  state.player.st = 1 / state.player.sq;
}

function startRelease(v) {
  if (v.state !== 0) return;
  v.state = 1;
  v.age = 0;
  v.releaseTargets = (v.lastTargets || []).filter(Boolean);
  releaseSound(v.spell);
}

function addTrackedTarget(v, target) {
  if (!target || !target.active) return;
  if (!v.lastTargets.includes(target)) v.lastTargets.push(target);
}

function canHoldDamage(v) {
  return v.spell.holdDealsDamage === true;
}

function pulseDamage(v, entity, dmg, hitEvery = 10) {
  if (!canHoldDamage(v) || dmg <= 0) return;
  if (!entity.active) return;
  if (v.age % hitEvery === 0) hurtEntity(entity, dmg, v.cx, v.cy);
}

function affectEntitiesInRadius(v, radius, fn) {
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dx = v.cx - ex;
    const dy = v.cy - ey;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    fn(e, dx, dy, dist || 1, ex, ey);
  }
}

function affectProjectilesInRadius(v, radius, fn) {
  for (const p of state.projectiles) {
    const dx = v.cx - p.x;
    const dy = v.cy - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    fn(p, dx, dy, dist || 1);
  }
}

function affectEntitiesOnLine(v, width, fn) {
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const hit = distToSegment(ex, ey, v.ox, v.oy, v.cx, v.cy);
    if (hit.dist > width) continue;
    fn(e, hit, ex, ey);
  }
}

function affectProjectilesOnLine(v, width, fn) {
  for (const p of state.projectiles) {
    const hit = distToSegment(p.x, p.y, v.ox, v.oy, v.cx, v.cy);
    if (hit.dist > width) continue;
    fn(p, hit);
  }
}

function insideRect(px, py, cx, cy, w, h) {
  return px > cx - w * 0.5 && px < cx + w * 0.5 && py > cy - h * 0.5 && py < cy + h * 0.5;
}

function updateNatureHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const pull = (1 - dist / s.holdR) * (s.holdForce || 0.28);
    e.vx += (dx / dist) * pull;
    e.vy += (dy / dist) * pull * 0.4 + 0.12;
    e.vx *= 0.84;
    pulseDamage(v, e, s.dmg, 10);
    addTrackedTarget(v, e);
    if (v.age % 6 === 0) {
      spawnP(ex, e.y + e.h, s.c2, 1, 'sparkle');
      spawnP(ex, ey, '#5c8f42', 1, 'dust');
    }
  });
  if (v.age % 3 === 0) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * s.holdR;
    spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r, '#4c8f45', 1, 'dust');
  }
  pushLight(v.cx, v.cy, s.holdR * 0.75, s.core, 0.5, 2);
}

function releaseNatureHold(v) {
  explode(v.cx, v.cy, v.spell.releaseR, 6, v.spell.releaseDmg, v.spell.color, v.spell.c2);
}

function updateWindHold(v) {
  const s = v.spell;
  const angle = holdAngle(v);
  v.lastTargets = [];
  affectEntitiesOnLine(v, s.holdWidth, (e, hit, ex, ey) => {
    const pull = (1 - hit.dist / s.holdWidth) * (s.holdForce || 0.55);
    e.vx += Math.cos(angle) * pull * 1.6;
    e.vy += Math.sin(angle) * pull * 1.4 - (s.holdLift || 0.7);
    e.vx *= 0.99;
    pulseDamage(v, e, s.dmg, 12);
    addTrackedTarget(v, e);
    if (v.age % 5 === 0) spawnP(ex, ey, s.core, 1, 'sparkle');
  });
  affectProjectilesOnLine(v, s.holdWidth + 8, (p, hit) => {
    const pull = (1 - hit.dist / (s.holdWidth + 8)) * 0.5;
    p.vx += Math.cos(angle) * pull * 1.8;
    p.vy += Math.sin(angle) * pull * 1.8 - 0.18;
  });
  const playerHit = distToSegment(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, v.ox, v.oy, v.cx, v.cy);
  if (playerHit.dist < s.holdWidth + 16) {
    const boost = (1 - playerHit.dist / (s.holdWidth + 16)) * 0.32;
    state.player.vx += Math.cos(angle) * boost * 1.6;
    state.player.vy += Math.sin(angle) * boost * 1.2 - 0.32;
  }
  if (v.age % 2 === 0) {
    const t = Math.random();
    spawnP(v.ox + (v.cx - v.ox) * t, v.oy + (v.cy - v.oy) * t, s.core, 1, 'sparkle');
  }
  pushLight((v.ox + v.cx) * 0.5, (v.oy + v.cy) * 0.5, 70, s.core, 0.45, 2);
}

function releaseWindHold(v) {
  const mx = (v.ox + v.cx) * 0.5;
  const my = (v.oy + v.cy) * 0.5;
  explode(mx, my, v.spell.releaseR, 5, v.spell.releaseDmg, v.spell.color, v.spell.c2);
}

function updateFireHold(v) {
  const s = v.spell;
  const angle = holdAngle(v);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  v.lastTargets = [];
  affectEntitiesOnLine(v, s.holdWidth, (e, hit, ex, ey) => {
    const intens = (1 - hit.dist / s.holdWidth);
    e.vx += nx * intens * 0.28 + Math.cos(angle) * 0.1;
    e.vy += ny * intens * 0.18 - (s.holdLift || 0.42);
    pulseDamage(v, e, s.dmg, 8);
    addTrackedTarget(v, e);
    if (v.age % 4 === 0) {
      spawnP(ex, ey, s.color, 1, 'ember');
      spawnP(ex, ey, s.c2, 1, 'sparkle');
    }
  });
  if (v.age % 2 === 0) {
    const t = Math.random();
    const px = v.ox + (v.cx - v.ox) * t + (Math.random() - 0.5) * 12;
    const py = v.oy + (v.cy - v.oy) * t + (Math.random() - 0.5) * 12;
    spawnP(px, py, Math.random() > 0.5 ? s.color : s.c2, 1, 'ember');
  }
  pushLight((v.ox + v.cx) * 0.5, (v.oy + v.cy) * 0.5, 84, s.c2, 0.55, 2);
}

function releaseFireHold(v) {
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const x = v.ox + (v.cx - v.ox) * t;
    const y = v.oy + (v.cy - v.oy) * t;
    explode(x, y, v.spell.releaseR * 0.45, 4, Math.floor(v.spell.releaseDmg * 0.55), v.spell.color, v.spell.c2);
  }
}

function updateWaterHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const tang = Math.atan2(dy, dx) + Math.PI / 2;
    const pull = (1 - dist / s.holdR) * (s.holdForce || 0.22);
    e.vx += (dx / dist) * pull + Math.cos(tang) * 0.22;
    e.vy += (dy / dist) * pull - (s.holdLift || 0.6);
    e.vx *= 0.95;
    pulseDamage(v, e, s.dmg, 12);
    addTrackedTarget(v, e);
    if (v.age % 5 === 0) spawnP(ex, ey, s.core, 1, 'sparkle');
  });
  affectProjectilesInRadius(v, s.holdR + 10, (p, dx, dy, dist) => {
    const tang = Math.atan2(dy, dx) + Math.PI / 2;
    const pull = (1 - dist / (s.holdR + 10)) * 0.24;
    p.vx += (dx / dist) * pull + Math.cos(tang) * 0.18;
    p.vy += (dy / dist) * pull - 0.12;
    p.vx *= 0.98;
    p.vy *= 0.98;
  });
  if (v.age % 2 === 0) {
    const a = v.age * 0.25 + Math.random();
    const r = s.holdR * (0.4 + Math.random() * 0.5);
    spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.7, s.c2, 1, 'sparkle');
  }
  pushLight(v.cx, v.cy, s.holdR, s.c2, 0.5, 2);
}

function releaseWaterHold(v) {
  explode(v.cx, v.cy, v.spell.releaseR, 5, v.spell.releaseDmg, v.spell.color, v.spell.c2);
  for (const e of v.releaseTargets || []) {
    if (!e.active) continue;
    e.vy += 10;
    e.vx *= 0.7;
  }
}

function updateLightningHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  const nodes = [
    { x: v.cx, y: v.cy - s.holdR * 0.9 },
    { x: v.cx - s.holdR * 0.78, y: v.cy + s.holdR * 0.5 },
    { x: v.cx + s.holdR * 0.78, y: v.cy + s.holdR * 0.5 },
  ];
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const pull = (1 - dist / s.holdR) * (s.holdForce || 0.12);
    e.vx += (dx / dist) * pull;
    e.vy += (dy / dist) * pull * 0.6;
    e.vx *= 0.82;
    e.vy *= 0.82;
    addTrackedTarget(v, e);
    if (v.age % 8 === 0) {
      hurtEntity(e, s.dmg, v.cx, v.cy);
      const node = nodes[(v.age / 8 + v.lastTargets.length) % nodes.length | 0];
      buildLightning(node.x, node.y, ex, ey, s.c2, 2);
    }
  });
  if (v.age % 4 === 0) buildLightning(nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y, s.color, 1);
  if (v.age % 4 === 2) buildLightning(nodes[1].x, nodes[1].y, nodes[2].x, nodes[2].y, s.color, 1);
  pushLight(v.cx, v.cy, s.holdR * 1.2, s.core, 0.7, 2);
}

function releaseLightningHold(v) {
  for (const e of v.releaseTargets || []) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    buildLightning(v.cx, v.cy, ex, ey, v.spell.core, 2);
    hurtEntity(e, Math.floor(v.spell.releaseDmg * 0.75), v.cx, v.cy);
  }
  explode(v.cx, v.cy, v.spell.releaseR, 6, v.spell.releaseDmg, v.spell.color, v.spell.c2);
}

function updateArcaneHold(v) {
  const s = v.spell;
  const frameW = s.holdR * 1.5;
  const frameH = s.holdR * 1.05;
  v.lastTargets = [];
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (p._heldByVectorFrame) continue;
    if (!insideRect(p.x, p.y, v.cx, v.cy, frameW, frameH)) continue;
    v.captured.push({
      spell: p.spell,
      radius: p.growR || p.spell?.r || 4,
      dmg: p.growDmg || p.spell?.dmg || 10,
      speed: Math.max(8, Math.hypot(p.vx, p.vy)),
      angle: Math.random() * Math.PI * 2,
      life: 0,
    });
    state.projectiles.splice(i, 1);
    spawnP(p.x, p.y, s.core, 4, 'sparkle');
  }
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const pull = (1 - dist / s.holdR) * 0.12;
    e.vx += (dx / dist) * pull;
    e.vy += (dy / dist) * pull * 0.3;
    pulseDamage(v, e, s.dmg, 18);
    addTrackedTarget(v, e);
    if (v.age % 6 === 0) spawnP(ex, ey, s.c2, 1, 'sparkle');
  });
  for (const cap of v.captured) cap.angle += 0.09;
  pushLight(v.cx, v.cy, s.holdR * 1.1, s.core, 0.55, 2);
}

function releaseArcaneHold(v) {
  const baseAngle = holdAngle(v);
  const count = Math.max(1, v.captured.length);
  for (let i = 0; i < v.captured.length; i++) {
    const cap = v.captured[i];
    const angle = baseAngle + (i - (count - 1) * 0.5) * 0.14;
    state.projectiles.push({
      x: v.cx,
      y: v.cy,
      vx: Math.cos(angle) * cap.speed,
      vy: Math.sin(angle) * cap.speed,
      spell: cap.spell,
      life: 220,
      age: 0,
      trail: [],
      hitList: [],
      bounces: cap.spell?.bounce || 0,
      chains: cap.spell?.chain || 0,
      growR: cap.radius,
      growDmg: cap.dmg,
    });
  }
  if (v.captured.length) explode(v.cx, v.cy, v.spell.releaseR, 5, Math.floor(v.spell.releaseDmg * 0.6), v.spell.color, v.spell.c2);
}

function updateVoidHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  let primary = null;
  let best = s.holdR;
  for (const e of state.entities) {
    if (!e.active) continue;
    const dist = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
    if (dist < best) {
      best = dist;
      primary = e;
    }
  }
  if (primary) {
    const ex = primary.x + primary.w / 2;
    const ey = primary.y + primary.h / 2;
    const dx = v.cx - ex;
    const dy = v.cy - ey;
    primary.vx += dx * 0.03;
    primary.vy += dy * 0.03;
    primary.vx *= 0.72;
    primary.vy *= 0.72;
    pulseDamage(v, primary, s.dmg, 8);
    addTrackedTarget(v, primary);
    if (v.age % 4 === 0) spawnP(ex, ey, s.c2, 1, 'void');
  }
  affectEntitiesInRadius(v, s.holdR * 1.2, (e, dx, dy, dist, ex, ey) => {
    if (e === primary) return;
    const pull = (1 - dist / (s.holdR * 1.2)) * (s.holdForce || 0.32);
    e.vx += (dx / dist) * pull * 0.8;
    e.vy += (dy / dist) * pull * 0.8;
    if (v.age % 16 === 0) pulseDamage(v, e, Math.max(1, s.dmg - 2), 16);
    if (v.age % 6 === 0) spawnP(ex, ey, '#5d2ab8', 1, 'void');
  });
  affectProjectilesInRadius(v, s.holdR * 1.2, (p, dx, dy, dist) => {
    const pull = (1 - dist / (s.holdR * 1.2)) * 0.26;
    p.vx += (dx / dist) * pull;
    p.vy += (dy / dist) * pull;
  });
  pushLight(v.cx, v.cy, s.holdR * 1.25, s.c2, 0.5, 2);
}

function releaseVoidHold(v) {
  explode(v.cx, v.cy, v.spell.releaseR, 7, v.spell.releaseDmg, v.spell.color, v.spell.c2);
}

function updateHolyHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const intens = 1 - dist / s.holdR;
    e.vx -= (dx / dist) * intens * 0.18;
    e.vy -= (s.holdLift || 0.5) * intens;
    e.vx *= 0.9;
    pulseDamage(v, e, s.dmg, 12);
    addTrackedTarget(v, e);
    if (v.age % 4 === 0) spawnP(ex, ey, s.core, 1, 'sparkle');
  });
  if (v.age % 12 === 0) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + (s.holdHeal || 0.35));
    state.player.mana = Math.min(state.player.maxMana, state.player.mana + (s.holdMana || 0.25));
    spawnP(state.player.x + state.player.w / 2, state.player.y, s.core, 2, 'sparkle');
  }
  pushLight(v.cx, v.cy, s.holdR * 1.15, s.core, 0.65, 2);
}

function releaseHolyHold(v) {
  explode(v.cx, v.cy, v.spell.releaseR, 6, v.spell.releaseDmg, v.spell.color, v.spell.c2);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 3);
}

function updateChronoHold(v) {
  const s = v.spell;
  const frameW = s.holdR * 1.45;
  const frameH = s.holdR * 0.95;
  v.lastTargets = [];
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    if (!insideRect(ex, ey, v.cx, v.cy, frameW, frameH)) continue;
    const sample = v.stored.get(e) || { vx: 0, vy: 0 };
    sample.vx += e.vx;
    sample.vy += e.vy;
    v.stored.set(e, sample);
    e.vx *= 0.55;
    e.vy *= 0.55;
    pulseDamage(v, e, s.dmg, 18);
    addTrackedTarget(v, e);
    if (v.age % 5 === 0) spawnP(ex, ey, s.c2, 1, 'sparkle');
  }
  for (const p of state.projectiles) {
    if (!insideRect(p.x, p.y, v.cx, v.cy, frameW, frameH)) continue;
    const sample = v.projectileStore.get(p) || { vx: 0, vy: 0 };
    sample.vx += p.vx;
    sample.vy += p.vy;
    v.projectileStore.set(p, sample);
    p.vx *= 0.58;
    p.vy *= 0.58;
  }
  pushLight(v.cx, v.cy, s.holdR, s.core, 0.5, 2);
}

function releaseChronoHold(v) {
  for (const [e, sample] of v.stored.entries()) {
    if (!e.active) continue;
    e.vx -= sample.vx * 0.2;
    e.vy -= sample.vy * 0.2;
    hurtEntity(e, v.spell.releaseDmg, v.cx, v.cy);
  }
  for (const [p, sample] of v.projectileStore.entries()) {
    p.vx += sample.vx * 0.15;
    p.vy += sample.vy * 0.15;
  }
  explode(v.cx, v.cy, v.spell.releaseR, 5, Math.floor(v.spell.releaseDmg * 0.6), v.spell.color, v.spell.c2);
}

function updateCelestialHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const ang = Math.atan2(dy, dx);
    const orbit = (1 - dist / s.holdR) * 0.36;
    e.vx += Math.cos(ang + Math.PI / 2) * orbit - Math.cos(ang) * 0.08;
    e.vy += Math.sin(ang + Math.PI / 2) * orbit - (s.holdLift || 0.28);
    pulseDamage(v, e, s.dmg, 10);
    addTrackedTarget(v, e);
    if (v.age % 5 === 0) spawnP(ex, ey, s.c2, 1, 'sparkle');
  });
  v.starPhase += 0.08;
  pushLight(v.cx, v.cy, s.holdR * 1.15, s.core, 0.6, 2);
}

function releaseCelestialHold(v) {
  explode(v.cx, v.cy, v.spell.releaseR, 6, v.spell.releaseDmg, v.spell.color, v.spell.c2);
}

function updateCinemaHold(v) {
  const s = v.spell;
  const frameW = s.holdR * 1.6;
  const frameH = s.holdR;
  v.lastTargets = [];
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    if (!insideRect(ex, ey, v.cx, v.cy, frameW, frameH)) continue;
    e.vx *= 0.4;
    e.vy *= 0.45;
    pulseDamage(v, e, s.dmg, 14);
    addTrackedTarget(v, e);
    if (v.age % 5 === 0) {
      spawnP(ex, ey, s.core, 1, 'sparkle');
      spawnP(ex, ey, '#111111', 1, 'dust');
    }
  }
  pushLight(v.cx, v.cy, s.holdR * 1.2, s.core, 0.45, 2);
}

function releaseCinemaHold(v) {
  explode(v.cx, v.cy, v.spell.releaseR, 7, v.spell.releaseDmg, v.spell.color, v.spell.c2);
}

function updateAetherforgeHold(v) {
  const s = v.spell;
  v.lastTargets = [];
  v.forgePhase = (v.forgePhase || 0) + 0.095;
  v.forgeCharge = Math.max(0, (v.forgeCharge || 0) * 0.992);

  let absorbed = 0;
  affectEntitiesInRadius(v, s.holdR, (e, dx, dy, dist, ex, ey) => {
    const falloff = Math.max(0, 1 - dist / s.holdR);
    const tang = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(v.forgePhase + dist * 0.05) * 0.2;
    const pull = (s.holdForce || 0.34) * falloff;

    e.vx += (dx / dist) * pull * 0.42 + Math.cos(tang) * pull * 0.95;
    e.vy += (dy / dist) * pull * 0.24 + Math.sin(tang) * pull * 0.7 - (s.holdLift || 0.22);
    e.vx *= 0.92;
    e.vy *= 0.95;
    pulseDamage(v, e, s.dmg, 8);
    addTrackedTarget(v, e);
    v.forgeCharge += falloff * 0.08;

    if (v.age % 4 === 0) {
      spawnP(ex, ey, s.color, 1, 'ember');
      spawnP(ex, ey, s.c2, 1, 'sparkle');
    }
  });

  affectProjectilesInRadius(v, s.holdR + 16, (p, dx, dy, dist) => {
    const ringR = s.holdR + 16;
    const falloff = Math.max(0, 1 - dist / ringR);
    const tang = Math.atan2(dy, dx) + Math.PI / 2;

    p.vx += Math.cos(tang) * 0.26 * falloff + (dx / dist) * 0.08 * falloff;
    p.vy += Math.sin(tang) * 0.26 * falloff + (dy / dist) * 0.08 * falloff - 0.03;
    p.vx *= 0.986;
    p.vy *= 0.986;

    if (dist < Math.max(20, s.holdR * 0.28) && v.age % 5 === 0 && !p.subProj) {
      absorbed += 1;
      v.forgeCharge += 0.34 + (p.spell?.dmg || 0) * 0.01;
      spawnP(p.x, p.y, s.core, 2, 'burst');
      p.life = Math.min(1, p.life || 1);
      p.vx *= 0.1;
      p.vy *= 0.1;
    }
  });

  if (absorbed > 0) SoundFX.playTone(460 + Math.min(520, absorbed * 80), 'triangle', 0.05, 0.08);

  if (v.age % 2 === 0) {
    const a = v.forgePhase + Math.random() * Math.PI * 2;
    const r = s.holdR * (0.45 + Math.random() * 0.45);
    const px = v.cx + Math.cos(a) * r;
    const py = v.cy + Math.sin(a) * r * 0.78;
    spawnP(px, py, Math.random() > 0.45 ? s.color : s.c2, 1, Math.random() > 0.52 ? 'ember' : 'sparkle');
  }

  const lightInt = Math.min(1.8, 0.55 + (v.forgeCharge || 0) * 0.09);
  pushLight(v.cx, v.cy, s.holdR * (1.05 + lightInt * 0.14), s.core, lightInt, 2);
}

function releaseAetherforgeHold(v) {
  const charge = Math.min(26, v.forgeCharge || 0);
  const bonusDmg = Math.floor(charge * 0.9);
  const releaseR = (v.spell.releaseR || 92) + charge * 1.6;

  explode(v.cx, v.cy, releaseR, 8, v.spell.releaseDmg + bonusDmg, v.spell.color, v.spell.c2);
  state.shake(Math.min(12, 5 + Math.floor(charge * 0.3)));
  state.shockwaves.push({
    x: v.cx,
    y: v.cy,
    r: 0,
    maxR: releaseR,
    life: 12,
    maxLife: 12,
    color: v.spell.core,
  });

  for (const e of v.releaseTargets || []) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dx = ex - v.cx;
    const dy = ey - v.cy;
    const dist = Math.hypot(dx, dy) || 1;
    const launch = 9 + charge * 0.24;

    e.vx += dx / dist * launch / (e.mass || 1);
    e.vy += dy / dist * launch * 0.45 / (e.mass || 1) - 1.6;
    hurtEntity(e, Math.floor(v.spell.releaseDmg * 0.4 + bonusDmg * 0.65), v.cx, v.cy);
    buildLightning(v.cx, v.cy, ex, ey, v.spell.c2, 2);
    spawnP(ex, ey, v.spell.core, 4, 'burst');
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.1;
    const r = releaseR * (0.3 + Math.random() * 0.7);
    spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.85, i % 2 === 0 ? v.spell.color : v.spell.c2, 1, 'ember');
  }
}

function updateHoldProfile(v) {
  switch (v.spell.holdProfile) {
    case 'nature_briar':
      updateNatureHold(v);
      break;
    case 'wind_slipstream':
      updateWindHold(v);
      break;
    case 'fire_kiln':
      updateFireHold(v);
      break;
    case 'water_undertow':
      updateWaterHold(v);
      break;
    case 'lightning_snare':
      updateLightningHold(v);
      break;
    case 'arcane_frame':
      updateArcaneHold(v);
      break;
    case 'void_grip':
      updateVoidHold(v);
      break;
    case 'holy_column':
      updateHolyHold(v);
      break;
    case 'chrono_frame':
      updateChronoHold(v);
      break;
    case 'celestial_orbit':
      updateCelestialHold(v);
      break;
    case 'cinema_freeze':
      updateCinemaHold(v);
      break;
    case 'aetherforge_crucible':
      updateAetherforgeHold(v);
      break;
    default:
      break;
  }
}

function releaseHoldProfile(v) {
  switch (v.spell.holdProfile) {
    case 'nature_briar':
      releaseNatureHold(v);
      break;
    case 'wind_slipstream':
      releaseWindHold(v);
      break;
    case 'fire_kiln':
      releaseFireHold(v);
      break;
    case 'water_undertow':
      releaseWaterHold(v);
      break;
    case 'lightning_snare':
      releaseLightningHold(v);
      break;
    case 'arcane_frame':
      releaseArcaneHold(v);
      break;
    case 'void_grip':
      releaseVoidHold(v);
      break;
    case 'holy_column':
      releaseHolyHold(v);
      break;
    case 'chrono_frame':
      releaseChronoHold(v);
      break;
    case 'celestial_orbit':
      releaseCelestialHold(v);
      break;
    case 'cinema_freeze':
      releaseCinemaHold(v);
      break;
    case 'aetherforge_crucible':
      releaseAetherforgeHold(v);
      break;
    default:
      break;
  }
}

export function createHoldSpell(options) {
  return {
    key: DEFAULT_KEY,
    category: 'Hold',
    speed: 0,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'none',
    isHoldSpell: true,
    holdDrain: 0.2,
    holdR: 72,
    holdWidth: 24,
    releaseR: 78,
    releaseDmg: 18,
    holdDealsDamage: false,
    ...options,
  };
}

export const HOLD_FIRE_HANDLERS = {
  isHoldSpell(s, ox, oy, tx, ty, idx) {
    const active = state.vfxSequences.find((v) => v.type === 'element_hold' && v.state === 0);
    if (active) startRelease(active);
    const point = clampScenePoint(tx, ty, s.holdR ? Math.min(36, s.holdR * 0.35) : 24);
    state.vfxSequences.push({
      type: 'element_hold',
      state: 0,
      age: 0,
      spell: s,
      spellIdx: idx,
      ox,
      oy,
      cx: point.x,
      cy: point.y,
      lastTargets: [],
      captured: [],
      stored: new Map(),
      projectileStore: new Map(),
      starPhase: Math.random() * Math.PI * 2,
      forgePhase: Math.random() * Math.PI * 2,
      forgeCharge: 0,
    });
    startSound(s);
    spawnP(point.x, point.y, s.c2, 6, 'burst');
    pushLight(point.x, point.y, s.holdR || 70, s.core, 1.1, 8);
    return true;
  },
};

export const HOLD_VFX_UPDATE = {
  element_hold(v) {
    const s = v.spell;
    const origin = casterOrigin();
    v.ox = origin.x;
    v.oy = origin.y;
    if (v.state === 0) {
      if (!state.mouse?.down) {
        startRelease(v);
        return;
      } else {
        const next = clampScenePoint(state.mouse.x, state.mouse.y, s.holdR ? Math.min(36, s.holdR * 0.35) : 24);
        v.cx += (next.x - v.cx) * 0.35;
        v.cy += (next.y - v.cy) * 0.35;
      }

      keepChannelPose();
      updateHoldProfile(v);

      if (v.age % 3 === 0) {
        state.player.mana = Math.max(0, state.player.mana - (s.holdDrain || 0.2));
        if (state.player.mana <= (s.holdDrain || 0.2) * 0.5) {
          startRelease(v);
          return;
        }
      }
    } else if (v.state === 1) {
      if (!v.didRelease) {
        releaseHoldProfile(v);
        v.didRelease = true;
      }
      if (v.age > 10) removeVfx(v);
    }
  },
};

function drawLineHold(v, X, inner, outer) {
  X.save();
  X.lineCap = 'round';
  X.strokeStyle = outer;
  X.lineWidth = v.spell.holdWidth + 12;
  X.globalAlpha = 0.12;
  X.beginPath();
  X.moveTo(v.ox, v.oy);
  X.lineTo(v.cx, v.cy);
  X.stroke();
  X.strokeStyle = inner;
  X.lineWidth = Math.max(4, v.spell.holdWidth * 0.55);
  X.globalAlpha = 0.42;
  X.beginPath();
  X.moveTo(v.ox, v.oy);
  X.lineTo(v.cx, v.cy);
  X.stroke();
  X.restore();
}

function drawRingHold(v, X, fill, edge) {
  X.save();
  X.globalAlpha = 0.18;
  X.fillStyle = fill;
  X.beginPath();
  X.arc(v.cx, v.cy, v.spell.holdR, 0, Math.PI * 2);
  X.fill();
  X.globalAlpha = 0.55;
  X.strokeStyle = edge;
  X.lineWidth = 2;
  X.beginPath();
  X.arc(v.cx, v.cy, v.spell.holdR, 0, Math.PI * 2);
  X.stroke();
  X.restore();
}

function drawRectHold(v, X, edge, glow) {
  const w = v.spell.holdR * 1.5;
  const h = v.spell.holdR;
  X.save();
  X.globalAlpha = 0.18;
  X.fillStyle = glow;
  X.fillRect(v.cx - w * 0.5, v.cy - h * 0.5, w, h);
  X.globalAlpha = 0.65;
  X.strokeStyle = edge;
  X.lineWidth = 2;
  X.strokeRect(v.cx - w * 0.5, v.cy - h * 0.5, w, h);
  X.restore();
}

function drawLightningHold(v, X) {
  const r = v.spell.holdR;
  const nodes = [
    { x: v.cx, y: v.cy - r * 0.9 },
    { x: v.cx - r * 0.78, y: v.cy + r * 0.5 },
    { x: v.cx + r * 0.78, y: v.cy + r * 0.5 },
  ];
  X.save();
  X.globalAlpha = 0.25;
  X.strokeStyle = v.spell.c2;
  X.lineWidth = 2;
  X.beginPath();
  X.moveTo(nodes[0].x, nodes[0].y);
  X.lineTo(nodes[1].x, nodes[1].y);
  X.lineTo(nodes[2].x, nodes[2].y);
  X.closePath();
  X.stroke();
  X.globalAlpha = 0.7;
  X.fillStyle = v.spell.core;
  for (const node of nodes) {
    X.beginPath();
    X.arc(node.x, node.y, 4, 0, Math.PI * 2);
    X.fill();
  }
  X.restore();
}

function drawArcaneCaptured(v, X) {
  X.save();
  for (const cap of v.captured) {
    const x = v.cx + Math.cos(cap.angle) * (20 + v.spell.holdR * 0.22);
    const y = v.cy + Math.sin(cap.angle) * (14 + v.spell.holdR * 0.12);
    X.globalAlpha = 0.75;
    X.fillStyle = v.spell.core;
    X.beginPath();
    X.arc(x, y, Math.max(2, cap.radius), 0, Math.PI * 2);
    X.fill();
    X.globalAlpha = 0.3;
    X.fillStyle = v.spell.c2;
    X.beginPath();
    X.arc(x, y, Math.max(5, cap.radius * 2.2), 0, Math.PI * 2);
    X.fill();
  }
  X.restore();
}

function drawCelestialStars(v, X) {
  X.save();
  for (let i = 0; i < 2; i++) {
    const a = v.starPhase + i * Math.PI;
    const x = v.cx + Math.cos(a) * v.spell.holdR * 0.78;
    const y = v.cy + Math.sin(a) * v.spell.holdR * 0.45;
    X.globalAlpha = 0.8;
    X.fillStyle = v.spell.core;
    X.beginPath();
    X.arc(x, y, 4, 0, Math.PI * 2);
    X.fill();
    X.globalAlpha = 0.28;
    X.fillStyle = v.spell.c2;
    X.beginPath();
    X.arc(x, y, 10, 0, Math.PI * 2);
    X.fill();
  }
  X.restore();
}

function drawAetherforgeHold(v, X) {
  const charge = Math.min(1.7, 0.45 + (v.forgeCharge || 0) * 0.08);
  const phase = v.forgePhase || 0;
  const rx = v.spell.holdR * (1.03 + Math.sin(phase * 0.7) * 0.02);
  const ry = v.spell.holdR * 0.74;

  X.save();
  X.translate(v.cx, v.cy);

  X.globalAlpha = 0.16 * charge;
  X.fillStyle = 'rgba(255,130,68,0.95)';
  X.beginPath();
  X.ellipse(0, 0, rx, ry, phase * 0.22, 0, Math.PI * 2);
  X.fill();

  X.strokeStyle = v.spell.c2;
  X.globalAlpha = 0.8 * charge;
  X.lineWidth = 2;
  X.setLineDash([8, 6]);
  X.beginPath();
  X.ellipse(0, 0, rx, ry, phase * 0.22, 0, Math.PI * 2);
  X.stroke();

  X.setLineDash([]);
  X.strokeStyle = '#ffffff';
  X.globalAlpha = 0.32 * charge;
  X.lineWidth = 1.3;
  X.beginPath();
  X.ellipse(0, 0, rx * 0.72, ry * 0.52, -phase * 0.34, 0, Math.PI * 2);
  X.stroke();

  for (let i = 0; i < 8; i++) {
    const a = phase * 1.5 + (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * rx * 0.88;
    const y = Math.sin(a) * ry * 0.88;
    const nx = Math.cos(a);
    const ny = Math.sin(a);

    X.strokeStyle = i % 2 === 0 ? v.spell.color : v.spell.c2;
    X.globalAlpha = 0.78 * charge;
    X.lineWidth = 2.2;
    X.beginPath();
    X.moveTo(x - nx * 8, y - ny * 8);
    X.lineTo(x + nx * 8, y + ny * 8);
    X.stroke();
  }

  X.globalAlpha = 0.24 * charge;
  X.fillStyle = v.spell.core;
  X.beginPath();
  X.arc(0, 0, Math.max(10, v.spell.holdR * 0.24), 0, Math.PI * 2);
  X.fill();
  X.restore();

  drawLineHold(v, X, 'rgba(255,245,210,0.92)', 'rgba(110,240,255,0.52)');
}

function drawWaterUndertowAccents(v, X) {
  const s = v.spell;
  const charge = Math.min(1, v.age / 30);
  const T = performance.now() * 0.003;
  const R = s.holdR || 76;
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, R * 1.2);
  g.addColorStop(0, 'rgba(190,245,255,0.5)');
  g.addColorStop(0.5, 'rgba(70,150,235,0.22)');
  g.addColorStop(1, 'transparent');
  X.fillStyle = g;
  X.globalAlpha = 0.55 * charge;
  X.beginPath(); X.arc(v.cx, v.cy, R * 1.2, 0, Math.PI * 2); X.fill();
  X.restore();
  for (let ring = 0; ring < 3; ring++) {
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.strokeStyle = ring === 1 ? '#ffffff' : s.c2;
    X.lineWidth = 1.6 - ring * 0.3;
    X.globalAlpha = (0.65 - ring * 0.15) * charge;
    X.beginPath();
    X.ellipse(v.cx, v.cy, R * (0.6 + ring * 0.14), R * 0.28, T * (0.5 + ring * 0.2), 0, Math.PI * 2);
    X.stroke();
    X.restore();
  }
  X.save();
  X.translate(v.cx, v.cy);
  X.globalCompositeOperation = 'lighter';
  for (let s2 = 0; s2 < 5; s2++) {
    const swirlA = T * (1 + s2 * 0.18) + s2 * 1.25;
    X.strokeStyle = '#ffffff';
    X.lineWidth = 1.6;
    X.globalAlpha = 0.6 * charge;
    X.beginPath();
    for (let a = 0; a < Math.PI * 2.4; a += 0.16) {
      const sr = R * (0.15 + a / (Math.PI * 2.4) * 0.75);
      const px = Math.cos(a + swirlA) * sr;
      const py = Math.sin(a + swirlA) * sr * 0.3;
      if (a === 0) X.moveTo(px, py); else X.lineTo(px, py);
    }
    X.stroke();
  }
  X.restore();
  for (let b = 0; b < 6; b++) {
    const ba = T * (1.4 + b * 0.2) + b * 1.04;
    const bx = v.cx + Math.cos(ba) * R * 0.5;
    const by = v.cy + Math.sin(ba) * R * 0.18 - 4;
    X.save();
    X.globalCompositeOperation = 'lighter';
    const bg = X.createRadialGradient(bx, by, 0, bx, by, 5);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, 'transparent');
    X.fillStyle = bg;
    X.globalAlpha = 0.85 * charge;
    X.beginPath(); X.arc(bx, by, 5, 0, Math.PI * 2); X.fill();
    X.restore();
  }
  X.globalAlpha = 1;
}

function drawNatureBriarAccents(v, X) {
  const s = v.spell;
  const charge = Math.min(1, v.age / 30);
  const T = performance.now() * 0.002;
  const R = s.holdR || 70;
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, R * 1.1);
  g.addColorStop(0, 'rgba(160,255,140,0.35)');
  g.addColorStop(0.45, 'rgba(80,200,80,0.18)');
  g.addColorStop(1, 'transparent');
  X.fillStyle = g;
  X.globalAlpha = 0.55 * charge;
  X.beginPath(); X.arc(v.cx, v.cy, R * 1.1, 0, Math.PI * 2); X.fill();
  X.restore();
  X.save();
  X.translate(v.cx, v.cy);
  X.strokeStyle = s.color;
  X.lineWidth = 1.6;
  X.lineCap = 'round';
  X.globalAlpha = 0.75 * charge;
  for (let i = 0; i < 7; i++) {
    const baseA = (i / 7) * Math.PI * 2 + T * 0.4;
    const tip = R * (0.55 + Math.sin(T * 1.6 + i) * 0.12);
    const ctrlA = baseA + 0.25 + Math.sin(T + i) * 0.18;
    const cx = Math.cos(ctrlA) * tip * 0.6;
    const cy = Math.sin(ctrlA) * tip * 0.6;
    const ex = Math.cos(baseA) * tip;
    const ey = Math.sin(baseA) * tip;
    X.beginPath();
    X.moveTo(0, 0);
    X.quadraticCurveTo(cx, cy, ex, ey);
    X.stroke();
    for (let t2 = 0; t2 < 3; t2++) {
      const tt = 0.3 + t2 * 0.25;
      const tx = (1 - tt) * (1 - tt) * 0 + 2 * (1 - tt) * tt * cx + tt * tt * ex;
      const ty = (1 - tt) * (1 - tt) * 0 + 2 * (1 - tt) * tt * cy + tt * tt * ey;
      const perpX = -Math.sin(baseA), perpY = Math.cos(baseA);
      X.fillStyle = s.c2;
      X.globalAlpha = 0.85 * charge;
      X.beginPath();
      X.moveTo(tx, ty);
      X.lineTo(tx + perpX * 3, ty + perpY * 3);
      X.lineTo(tx - perpX * 3, ty - perpY * 3);
      X.closePath(); X.fill();
    }
  }
  X.restore();
  X.globalAlpha = 1;
}

export const HOLD_VFX_DRAW = {
  element_hold(v, X) {
    switch (v.spell.holdProfile) {
      case 'nature_briar':
        drawRingHold(v, X, 'rgba(48,95,34,0.45)', v.spell.c2);
        drawNatureBriarAccents(v, X);
        break;
      case 'wind_slipstream':
        drawLineHold(v, X, 'rgba(240,255,255,0.8)', 'rgba(200,240,255,0.45)');
        break;
      case 'fire_kiln':
        drawLineHold(v, X, 'rgba(255,190,90,0.95)', 'rgba(255,90,20,0.5)');
        break;
      case 'water_undertow':
        drawRingHold(v, X, 'rgba(70,130,255,0.32)', 'rgba(190,245,255,0.8)');
        drawWaterUndertowAccents(v, X);
        break;
      case 'lightning_snare':
        drawLightningHold(v, X);
        break;
      case 'arcane_frame':
        drawRectHold(v, X, v.spell.c2, 'rgba(155,105,255,0.22)');
        drawArcaneCaptured(v, X);
        break;
      case 'void_grip':
        drawRingHold(v, X, 'rgba(40,0,80,0.35)', 'rgba(180,120,255,0.65)');
        break;
      case 'holy_column':
        drawRingHold(v, X, 'rgba(255,235,140,0.22)', 'rgba(255,255,255,0.8)');
        break;
      case 'chrono_frame':
        drawRectHold(v, X, v.spell.c2, 'rgba(120,190,255,0.18)');
        break;
      case 'celestial_orbit':
        drawRingHold(v, X, 'rgba(120,150,255,0.2)', 'rgba(255,230,150,0.7)');
        drawCelestialStars(v, X);
        break;
      case 'cinema_freeze':
        drawRectHold(v, X, v.spell.c2, 'rgba(255,240,185,0.18)');
        X.save();
        X.globalAlpha = 0.08;
        X.fillStyle = '#ffffff';
        for (let y = v.cy - v.spell.holdR * 0.5; y < v.cy + v.spell.holdR * 0.5; y += 6) {
          X.fillRect(v.cx - v.spell.holdR * 0.8, y, v.spell.holdR * 1.6, 2);
        }
        X.restore();
        break;
      case 'aetherforge_crucible':
        drawAetherforgeHold(v, X);
        break;
      default:
        break;
    }
  },
};
