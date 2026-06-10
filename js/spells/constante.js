// constante.js — Constante school
// Occult detective ritual magic: ward first, draw the sigil, then risk the cast.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { isEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { createAlly } from '../core/allies.js?v=1';

const PAL = {
  coat: '#d6b56d',
  smoke: '#786b5b',
  ember: '#ff7a3a',
  blood: '#8d1d2c',
  paper: '#f0e2bd',
  hell: '#d6451f',
  void: '#211515',
};

const SIGIL_ORDER = [
  'brimstoneChain',
  'ashenExorcism',
  'demonSnare',
  'cigaretteHex',
  'debtCollector',
  'crossroadBlink',
  'lastRite',
];

const SIGIL_LABELS = {
  infernalPortal: 'PORTA',
  brimstoneChain: 'CORRENTE',
  ashenExorcism: 'EXORCISMO',
  demonSnare: 'LACO',
  cigaretteHex: 'CINZA',
  debtCollector: 'DIVIDA',
  crossroadBlink: 'CRUZ',
  lastRite: 'RITO',
};

const SIGIL_GLYPHS = {
  brimstoneChain: ['C', 'H', 'A', 'I', 'N'],
  ashenExorcism: ['A', 'S', 'H', 'X'],
  demonSnare: ['S', 'N', 'A', 'R', 'E'],
  cigaretteHex: ['S', 'M', 'O', 'K', 'E'],
  debtCollector: ['D', 'E', 'B', 'T'],
  crossroadBlink: ['N', 'E', 'S', 'W'],
  lastRite: ['L', 'A', 'S', 'T', '7', '13'],
};

const SIGIL_TEMPLATES = {
  brimstoneChain: {
    shape: 'triangle',
    closed: true,
    threshold: 0.34,
    template: [
      { x: 0, y: -1 },
      { x: 0.92, y: 0.78 },
      { x: -0.92, y: 0.78 },
      { x: 0, y: -1 },
    ],
  },
  ashenExorcism: {
    shape: 'cross',
    closed: false,
    threshold: 0.42,
    template: [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: -0.8, y: 0 },
      { x: 0.8, y: 0 },
    ],
  },
  demonSnare: {
    shape: 'loop',
    closed: true,
    threshold: 0.36,
    template: [
      { x: 0, y: -1 },
      { x: 0.72, y: -0.72 },
      { x: 1, y: 0 },
      { x: 0.72, y: 0.72 },
      { x: 0, y: 1 },
      { x: -0.72, y: 0.72 },
      { x: -1, y: 0 },
      { x: -0.72, y: -0.72 },
      { x: 0, y: -1 },
    ],
  },
  cigaretteHex: {
    shape: 'zigzag',
    closed: false,
    threshold: 0.44,
    template: [
      { x: -1, y: -0.55 },
      { x: -0.5, y: 0.6 },
      { x: 0, y: -0.55 },
      { x: 0.5, y: 0.6 },
      { x: 1, y: -0.55 },
    ],
  },
  debtCollector: {
    shape: 'square',
    closed: true,
    threshold: 0.35,
    template: [
      { x: -0.85, y: -0.85 },
      { x: 0.85, y: -0.85 },
      { x: 0.85, y: 0.85 },
      { x: -0.85, y: 0.85 },
      { x: -0.85, y: -0.85 },
    ],
  },
  crossroadBlink: {
    shape: 'x',
    closed: false,
    threshold: 0.42,
    template: [
      { x: -0.85, y: -0.85 },
      { x: 0.85, y: 0.85 },
      { x: 0, y: 0 },
      { x: 0.85, y: -0.85 },
      { x: -0.85, y: 0.85 },
    ],
  },
  lastRite: {
    shape: 'star',
    closed: true,
    threshold: 0.38,
    template: [
      { x: 0, y: -1 },
      { x: 0.59, y: 0.81 },
      { x: -0.95, y: -0.31 },
      { x: 0.95, y: -0.31 },
      { x: -0.59, y: 0.81 },
      { x: 0, y: -1 },
    ],
  },
};

const CIRCLE_SIGILS = ['I', 'V', 'X', 'M', 'N', 'O', '7', '13'];

const PARTICLE_PRESETS = {
  burst: { vMul: 4, life: 30, size: 3, grav: 0.15 },
  explode: { vMul: 6, life: 55, size: 4, grav: 0.18 },
  sparkle: { vMul: 2, life: 40, size: 2, grav: -0.02 },
  smoke: { vMul: 1, life: 50, size: 5, grav: -0.04 },
  dust: { vMul: 1.5, life: 35, size: 3, grav: 0.05 },
  ember: { vMul: 2, life: 45, size: 2, grav: 0.06 },
};

function spawnP(x, y, color, count = 1, type = 'burst') {
  const preset = PARTICLE_PRESETS[type] || PARTICLE_PRESETS.burst;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = (0.5 + Math.random()) * preset.vMul;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 5,
      y: y + (Math.random() - 0.5) * 5,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: (preset.life + Math.random() * preset.life * 0.5) | 0,
      ml: preset.life,
      color,
      size: preset.size + Math.random() * 2,
      grav: preset.grav,
      type,
      rot: Math.random() * 6.28,
      rotV: (Math.random() - 0.5) * 0.2,
    });
  }
}

function hurtEntity(e, dmg, fx = e.x + e.w / 2, fy = e.y + e.h / 2) {
  if (!e || dmg <= 0) return;
  e.hp -= dmg;
  e.hitF = 180;
  state.damageNumbers.push({
    x: e.x + e.w / 2,
    y: e.y - 8,
    val: dmg,
    life: 70,
    vy: -2,
    color: '#ff4444',
    sc: 1 + dmg / 30,
  });
  if (e.hp <= 0) {
    e.active = false;
    spawnP(e.x + e.w / 2, e.y + e.h / 2, '#aaa', 20, 'explode');
  } else {
    const a = Math.atan2(e.y + e.h / 2 - fy, e.x + e.w / 2 - fx);
    e.vx += Math.cos(a) * 2.5 / (e.mass || 1);
    e.vy += Math.sin(a) * 1.4 / (e.mass || 1) - 0.6;
  }
}

function playerCenter() {
  const p = state.player;
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

function bodyCenter(body) {
  return { x: body.x + body.w / 2, y: body.y + body.h / 2 };
}

function nearestEnemy(x, y, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    const c = bodyCenter(e);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function ensureSigilSet() {
  const p = state.player;
  if (!(p.constanteSigils instanceof Set)) p.constanteSigils = new Set();
  return p.constanteSigils;
}

function pushCircle(s, cx, cy, {
  sigils = CIRCLE_SIGILS,
  radius = 48,
  duration = 70,
  fizzle = false,
  label = '',
} = {}) {
  state.vfxSequences.push({
    type: 'constante_magic_circle',
    state: 0,
    age: 0,
    cx,
    cy,
    radius,
    duration,
    fizzle,
    label,
    sigils,
    spell: s,
  });
}

function spellBySigil(sigilKey) {
  return SPELL_DEFS.find((spell) => spell.sigilKey === sigilKey) || null;
}

function createScriptOptions() {
  const sigils = ensureSigilSet();
  const n = SIGIL_ORDER.length;
  return SIGIL_ORDER.map((sigilKey, i) => {
    const spell = spellBySigil(sigilKey);
    const sigil = SIGIL_TEMPLATES[sigilKey] || SIGIL_TEMPLATES.brimstoneChain;
    const x = (state.W / (n + 1)) * (i + 1);
    const y = 72 + (i % 2) * 24;
    return {
      sigilKey,
      label: SIGIL_LABELS[sigilKey],
      shape: sigil.shape,
      template: sigil.template,
      closed: sigil.closed,
      threshold: sigil.threshold,
      glyphs: SIGIL_GLYPHS[sigilKey] || CIRCLE_SIGILS,
      spellName: spell?.name || sigilKey,
      color: spell?.color || PAL.coat,
      c2: spell?.c2 || PAL.paper,
      core: spell?.core || '#ffffff',
      x,
      y,
      unlocked: sigils.has(sigilKey),
    };
  });
}

function nearestScriptOption(x, y, options) {
  let best = null;
  let bestD = Infinity;
  for (const option of options || []) {
    const d = Math.hypot(option.x - x, option.y - y);
    if (d < bestD) {
      best = option;
      bestD = d;
    }
  }
  return best;
}

function pathLength(points = []) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}

function resamplePath(points = [], count = 40) {
  const clean = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (clean.length === 0) return [];
  if (clean.length === 1) return Array.from({ length: count }, () => ({ ...clean[0] }));
  const total = pathLength(clean);
  if (total <= 0.001) return Array.from({ length: count }, () => ({ ...clean[0] }));

  const out = [{ ...clean[0] }];
  let covered = 0;
  let segStart = clean[0];
  let index = 1;
  for (let sample = 1; sample < count; sample++) {
    const target = (total * sample) / (count - 1);
    while (index < clean.length) {
      const segEnd = clean[index];
      const segment = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y);
      if (covered + segment >= target || segment <= 0.001) break;
      covered += segment;
      segStart = segEnd;
      index++;
    }
    const segEnd = clean[index] || segStart;
    const segment = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y) || 1;
    const t = Math.max(0, Math.min(1, (target - covered) / segment));
    out.push({
      x: segStart.x + (segEnd.x - segStart.x) * t,
      y: segStart.y + (segEnd.y - segStart.y) * t,
    });
  }
  return out;
}

function normalizePath(points = [], count = 40) {
  const sampled = resamplePath(points, count);
  if (sampled.length === 0) return [];
  const xs = sampled.map((p) => p.x);
  const ys = sampled.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = Math.max(maxX - minX, maxY - minY, 1);
  return sampled.map((p) => ({ x: ((p.x - cx) / scale) * 2, y: ((p.y - cy) / scale) * 2 }));
}

function shiftedPath(points, shift) {
  const n = points.length;
  return points.map((_, i) => points[(i + shift) % n]);
}

function meanPathDistance(a = [], b = []) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  return total / n;
}

function bestTemplateDistance(stroke, option) {
  const drawn = normalizePath(stroke, 40);
  const template = normalizePath(option.template || [], 40);
  if (drawn.length < 8 || template.length < 8) return Infinity;
  const reversed = [...template].reverse();
  const candidates = option.closed
    ? Array.from({ length: 10 }, (_, i) => i * 4).flatMap((shift) => [shiftedPath(template, shift), shiftedPath(reversed, shift)])
    : [template, reversed];
  return Math.min(...candidates.map((candidate) => meanPathDistance(drawn, candidate)));
}

function matchDrawnSigil(stroke, options, minDistance = 86) {
  if (!stroke || stroke.length < 5 || pathLength(stroke) < minDistance) return null;
  let best = null;
  for (const option of options || []) {
    const score = bestTemplateDistance(stroke, option);
    if (!best || score < best.score) best = { option, score };
  }
  if (!best || best.score > (best.option.threshold || 0.4)) return null;
  return best;
}

function strokeCenter(stroke = []) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of stroke) {
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  if (minX === Infinity) return null;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

function triggerDrawnSigil(v, sigilKey) {
  const p = state.player;
  const spell = spellBySigil(sigilKey);
  if (!p || !spell) return false;
  ensureSigilSet().add(sigilKey);
  const flag = Object.keys(FIRE_HANDLERS).find((name) => spell[name]);
  if (!flag) return false;
  // Conjure at the center of where the sigil was drawn, not the last stroke point.
  const center = strokeCenter(v.stroke) || state.mouse || { x: v.cx, y: v.cy };
  const tx = center.x ?? v.cx;
  const ty = center.y ?? v.cy;
  v.castX = tx;
  v.castY = ty;
  const ox = p.x + p.w / 2 + (p.facing || 1) * 10;
  const oy = p.y + 8;
  FIRE_HANDLERS[flag](spell, ox, oy, tx, ty);
  return true;
}

function finishScript(v, sigilKey) {
  const p = state.player;
  const spell = spellBySigil(sigilKey);
  p.constanteSlowFactor = 1;
  v.completedSigil = sigilKey;
  v.done = true;
  state.vfxSequences.push({
    type: 'constante_spell_name',
    state: 0,
    age: 0,
    spell: spell || v.spell,
    text: spell?.name || SIGIL_LABELS[sigilKey] || sigilKey,
    color: spell?.core || PAL.paper,
    c2: spell?.c2 || PAL.coat,
    x: state.W / 2,
    y: 96,
  });
  const center = strokeCenter(v.stroke) || { x: v.cx, y: v.cy };
  spawnP(center.x, center.y, spell?.core || PAL.paper, 18, 'sparkle');
  SoundFX.playTone(880, 'triangle', 0.18, 0.14);
  triggerDrawnSigil(v, sigilKey);
}

function resetScriptStroke(v) {
  v.stroke = [];
  v.strokeLength = 0;
  v.drawTarget = null;
  v.lastPoint = null;
}

function failCast(s, ox, oy, reason = 'ward') {
  const p = state.player;
  if (p) p.mana = Math.min(p.maxMana || p.mana || 0, (p.mana || 0) + (s.mana || 0));
  pushCircle(s, ox, oy, {
    radius: 38,
    duration: 34,
    fizzle: true,
    label: reason,
    sigils: ['!', 'X', '0', '?'],
  });
  SoundFX.playSweep(180, 60, 'sawtooth', 0.18, 0.12);
  return false;
}

function requireSigil(s, ox, oy) {
  const sigils = ensureSigilSet();
  if (!sigils.has(s.sigilKey)) return failCast(s, ox, oy, `SIGILO ${SIGIL_LABELS[s.sigilKey] || ''}`);
  sigils.delete(s.sigilKey);
  return true;
}

function beginCastPose(castType = 'channel', frames = 300) {
  const p = state.player;
  p.castAnim = frames;
  p.castType = castType;
  p.staffGlow = Math.max(p.staffGlow || 0, frames);
  p.sq = castType === 'slam' ? 0.75 : 1.16;
  p.st = 1 / p.sq;
  p.vx *= 0.55;
  p.vy *= 0.72;
}

function makeHoldChannel(base = {}, s, castType = 'channel', { holdRequired = !s.requiresSigil } = {}) {
  const writerSigil = s.sigilKey ? SIGIL_TEMPLATES[s.sigilKey] : null;
  return {
    ...base,
    holdRequired,
    cinematicChannel: true,
    holdProgress: 0,
    holdCastType: castType,
    startedHeld: !!state.mouse?.down,
    sigilKey: s.sigilKey || null,
    writerSigil,
    writerLabel: s.sigilKey ? SIGIL_LABELS[s.sigilKey] : '',
    writerGlyphs: s.sigilKey ? SIGIL_GLYPHS[s.sigilKey] : [],
    writerProgress: 0,
  };
}

function cancelHoldChannel(v, { refund = false } = {}) {
  v.cancelled = true;
  v.done = true;
  if (refund && v.sigilKey) ensureSigilSet().add(v.sigilKey);
  const s = v.spell || {};
  const cx = v.cx ?? v.ox ?? state.player?.x ?? 0;
  const cy = v.cy ?? v.oy ?? state.player?.y ?? 0;
  spawnP(cx, cy, '#772222', 12, 'smoke');
  spawnP(cx, cy, s.color || PAL.hell, 6, 'ember');
  SoundFX.playSweep(220, 70, 'sawtooth', 0.16, 0.12);
}

function continueHoldChannel(v, castType = 'channel', { refund = false } = {}) {
  const p = state.player;
  if (!p) {
    v.done = true;
    return false;
  }
  const holding = !!state.mouse?.down;
  if (v.holdRequired !== false && !holding) {
    cancelHoldChannel(v, { refund });
    return false;
  }
  beginCastPose(castType, Math.min(300, v.spell?.castFrames || 300));
  v.holdProgress = Math.max(0, Math.min(1, v.age / (v.castFrames || v.spell?.castFrames || 300)));
  v.writerProgress = v.holdProgress;
  if (v.age % 8 === 0) {
    const cx = v.cx ?? v.ox ?? (p.x + p.w / 2);
    const cy = v.cy ?? v.oy ?? (p.y + p.h / 2);
    spawnP(cx, cy, v.spell?.c2 || PAL.paper, 1, 'sparkle');
  }
  state.shake(Math.max(state.screenShake || 0, v.holdProgress * 3));
  return true;
}

function makeDemon(x, y, role, s, index = 0) {
  const w = role === 'ranged' ? 14 : 18;
  const h = role === 'ranged' ? 28 : 34;
  const demon = {
    role,
    x,
    y,
    vx: (index - 1) * 0.6,
    vy: -1.8 - Math.random(),
    attackCd: 20 + index * 8,
    age: 0,
    facing: index % 2 === 0 ? 1 : -1,
    ally: createAlly({
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      mana: s.mana,
      threat: role === 'ranged' ? 32 : 48,
      type: `ally-constante-${role}`,
      color: s.color,
      c2: s.c2,
      hpScale: role === 'ranged' ? 1.35 : 1.8,
    }),
  };
  state.entities.push(demon.ally);
  return demon;
}

function syncDemon(d) {
  if (!d.ally || !d.ally.active || d.ally.hp <= 0) return false;
  d.ally.x = d.x - d.ally.w / 2;
  d.ally.y = d.y - d.ally.h / 2;
  return true;
}

function retireDemon(d) {
  if (d.ally) d.ally.active = false;
}

function launchDemonBolt(d, target, s) {
  const tc = bodyCenter(target);
  const a = Math.atan2(tc.y - d.y, tc.x - d.x);
  const boltSpell = {
    name: 'Prego Infernal',
    color: s.color,
    c2: s.c2,
    core: s.core,
    dmg: Math.max(4, Math.floor(s.dmg * 0.65)),
    r: 4,
    grav: 0,
    drag: 1,
    bounce: 0,
    exR: 0,
    exF: 0,
    trail: 'constante_ember',
  };
  state.projectiles.push(createPlayerProjectile({
    x: d.x,
    y: d.y - 6,
    vx: Math.cos(a) * 7.8,
    vy: Math.sin(a) * 7.8,
    spell: boltSpell,
    life: 100,
  }));
  spawnP(d.x, d.y - 6, s.core, 5, 'ember');
  SoundFX.playTone(280, 'square', 0.08, 0.08);
}

function updateDemon(d, s) {
  if (!syncDemon(d)) return false;
  d.age++;
  d.attackCd--;
  const target = nearestEnemy(d.x, d.y, d.role === 'ranged' ? 520 : 900);
  if (target) {
    const tc = bodyCenter(target);
    const dx = tc.x - d.x;
    const dy = tc.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    d.facing = dx >= 0 ? 1 : -1;
    if (d.role === 'melee') {
      d.vx += (dx / dist) * 0.45;
      d.vy += (dy / dist) * 0.22;
      if (dist < 34 && d.attackCd <= 0) {
        d.attackCd = 34;
        hurtEntity(target, s.dmg, d.x, d.y);
        target.vx += (dx / dist) * 4;
        target.vy -= 2;
        spawnP(tc.x, tc.y, s.core, 8, 'ember');
        state.shake(4);
      }
    } else {
      const desired = dist < 145 ? -0.22 : 0.18;
      d.vx += (dx / dist) * desired;
      d.vy += (dy / dist) * desired * 0.45;
      if (d.attackCd <= 0) {
        d.attackCd = 58;
        launchDemonBolt(d, target, s);
      }
    }
  } else {
    const pc = playerCenter();
    const dx = pc.x + (d.role === 'ranged' ? -40 : 40) - d.x;
    const dy = pc.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    d.vx += (dx / dist) * 0.12;
    d.vy += (dy / dist) * 0.08;
  }
  const max = d.role === 'ranged' ? 3.2 : 4.2;
  const sp = Math.hypot(d.vx, d.vy);
  if (sp > max) {
    d.vx = (d.vx / sp) * max;
    d.vy = (d.vy / sp) * max;
  }
  d.x += d.vx;
  d.y += d.vy;
  d.vx *= 0.92;
  d.vy *= 0.92;
  if (d.age % 7 === 0) spawnP(d.x, d.y + 8, s.color, 1, 'smoke');
  return true;
}

function applySlowField(factor) {
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    e.vx *= factor;
    e.vy *= factor;
  }
  for (const p of state.enemyProjectiles) {
    if (p.life <= 0) continue;
    p.vx *= factor;
    p.vy *= factor;
  }
}

function damageInRadius(cx, cy, r, dmg, color, force = 0) {
  let hits = 0;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    const ec = bodyCenter(e);
    const dx = ec.x - cx;
    const dy = ec.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > r) continue;
    hits++;
    hurtEntity(e, Math.max(1, Math.floor(dmg * (1 - dist / (r * 1.4)))), cx, cy);
    if (force > 0) {
      const m = e.mass || 1;
      const safe = dist || 1;
      e.vx += (dx / safe) * force / m;
      e.vy += (dy / safe) * force / m - 1.5;
    }
    spawnP(ec.x, ec.y, color, 5, 'ember');
  }
  return hits;
}

export const SPELL_DEFS = [
  {
    name: 'Hellblazer Ward',
    icon: '🛡️',
    key: '1',
    category: 'Shield',
    color: PAL.coat,
    c2: PAL.paper,
    core: '#ffffff',
    speed: 0,
    dmg: 0,
    mana: 20,
    cd: 700,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante',
    isHellblazerWard: true,
    requiresCircle: true,
    wardDur: 300,
    wardR: 58,
    desc: 'Escudo ritual de 5s que segura a pressao infernal enquanto os outros casts terminam.'
  },
  {
    name: 'Sigil Script',
    icon: '✒️',
    key: '2',
    category: 'Writing',
    color: '#b2874a',
    c2: PAL.paper,
    core: '#fff7d6',
    speed: 0,
    dmg: 0,
    mana: 12,
    cd: 260,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante',
    isSigilScript: true,
    requiresCircle: true,
    writeFrames: 300,
    drawMinDistance: 86,
    slowFactor: 0.05,
    desc: 'Abre o overlay ritual: realidade em 5% de velocidade, sete sigilos aparecem e voce desenha uma magia sem limite de tempo.'
  },
  {
    name: 'Infernal Breach',
    icon: '🜏',
    key: '3',
    category: 'Summon',
    color: PAL.hell,
    c2: '#ff9a55',
    core: '#fff0bf',
    speed: 0,
    dmg: 12,
    mana: 44,
    cd: 4200,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante_ember',
    isInfernalPortal: true,
    requiresCircle: true,
    castFrames: 480,
    cancelOnKnockback: true,
    demonDur: 660,
    desc: 'Canaliza 8s; knockback cancela. Abre um portal do submundo que solta demonios melee e ranged.'
  },
  {
    name: 'Brimstone Chain',
    icon: '⛓️',
    key: '4',
    category: 'Ritual',
    color: '#c74b2a',
    c2: '#ffb15f',
    core: '#fff0bf',
    speed: 0,
    dmg: 76,
    mana: 34,
    cd: 1600,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante_ember',
    isBrimstoneChain: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'brimstoneChain',
    castFrames: 260,
    chainR: 320,
    desc: 'Sigilo desenhado: puxa ate tres inimigos por correntes de enxofre e cobra dano pesado.'
  },
  {
    name: 'Ashen Exorcism',
    icon: '☩',
    key: '5',
    category: 'Ritual',
    color: '#7c6d5c',
    c2: '#d8c49a',
    core: '#fff7d6',
    speed: 0,
    dmg: 86,
    mana: 38,
    cd: 2100,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante_smoke',
    isAshenExorcism: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'ashenExorcism',
    castFrames: 320,
    exorcismR: 165,
    desc: 'Sigilo desenhado: sopra cinza consagrada; purga, empurra e rasga tudo na borda.'
  },
  {
    name: 'Demon Snare',
    icon: '🪤',
    key: '6',
    category: 'Trap',
    color: '#5a1c22',
    c2: '#e14d40',
    core: '#ffd7ba',
    speed: 0,
    dmg: 18,
    mana: 32,
    cd: 1800,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante',
    isDemonSnare: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'demonSnare',
    castFrames: 300,
    snareR: 112,
    snareDur: 380,
    desc: 'Sigilo desenhado: roda de sangue que prende pernas e garras com mordidas infernais.'
  },
  {
    name: 'Cigarette Hex',
    icon: '🚬',
    key: 'Q',
    category: 'Curse',
    color: PAL.smoke,
    c2: '#d8c49a',
    core: PAL.ember,
    speed: 0,
    dmg: 24,
    mana: 28,
    cd: 1500,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante_smoke',
    isCigaretteHex: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'cigaretteHex',
    castFrames: 220,
    hexDur: 380,
    hexR: 540,
    desc: 'Sigilo desenhado: apaga a brasa no nome do alvo; a fumaca persegue e cobra dano em pulsos.'
  },
  {
    name: 'Debt Collector',
    icon: '💼',
    key: 'E',
    category: 'Summon',
    color: '#3b2520',
    c2: '#d6b56d',
    core: '#ffdf8f',
    speed: 0,
    dmg: 44,
    mana: 44,
    cd: 3200,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante_ember',
    isDebtCollector: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'debtCollector',
    castFrames: 340,
    demonDur: 640,
    desc: 'Sigilo desenhado: chama um cobrador infernal de sobretudo para executar a divida mais proxima.'
  },
  {
    name: 'Crossroad Blink',
    icon: '✚',
    key: 'X',
    category: 'Teleport',
    color: '#53332a',
    c2: PAL.paper,
    core: '#ffffff',
    speed: 0,
    dmg: 0,
    mana: 30,
    cd: 1900,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante',
    isCrossroadBlink: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'crossroadBlink',
    castFrames: 180,
    blinkRange: 340,
    desc: 'Sigilo desenhado: dobra uma encruzilhada curta, some em cinza e reaparece no circulo escolhido.'
  },
  {
    name: 'Last Rite',
    icon: '🕯️',
    key: 'T',
    category: 'Ultimate',
    color: '#1d1412',
    c2: '#d6b56d',
    core: '#ffffff',
    speed: 0,
    dmg: 168,
    mana: 100,
    cd: 12000,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'constante_ember',
    isLastRite: true,
    requiresCircle: true,
    requiresSigil: true,
    hiddenFromUi: true,
    cinematicSigilCast: true,
    sigilKey: 'lastRite',
    castFrames: 420,
    riteR: 275,
    desc: '(Ultimate) Sigilo desenhado: le o ultimo rito; demonios, correntes e cinza explodem em julgamento.'
  },
];

export const FIRE_HANDLERS = {
  isHellblazerWard(s, ox, oy) {
    const c = playerCenter();
    state.player.constanteWard = s.wardDur;
    pushCircle(s, c.x, c.y + 14, { radius: 54, duration: 54, label: 'WARD', sigils: ['W', 'A', 'R', 'D'] });
    state.vfxSequences.push({ type: 'constante_ward', state: 0, age: 0, spell: s, cx: c.x, cy: c.y, blocked: 0 });
    beginCastPose('front_pose', 300);
    SoundFX.playSweep(120, 520, 'sine', 0.35, 0.25);
    spawnP(c.x, c.y, s.c2, 14, 'sparkle');
    return true;
  },

  isSigilScript(s, ox, oy) {
    const c = playerCenter();
    const options = createScriptOptions();
    state.player.constanteSlowFactor = s.slowFactor;
    pushCircle(s, c.x, c.y + 20, { radius: 66, duration: s.writeFrames, label: 'SCRIPT', sigils: CIRCLE_SIGILS });
    state.vfxSequences.push({
      type: 'constante_script',
      state: 0,
      age: 0,
      spell: s,
      cx: c.x,
      cy: c.y + 20,
      options,
      sigils: CIRCLE_SIGILS,
      stroke: [],
      strokeLength: 0,
      drawTarget: null,
      lastPoint: null,
      mouseWasDown: false,
      slowFactor: s.slowFactor,
    });
    beginCastPose('channel', s.writeFrames);
    SoundFX.playNoise(0.16, 0.35, 360, 'bandpass', 3);
    return true;
  },

  isInfernalPortal(s, ox, oy, tx, ty) {
    pushCircle(s, tx, ty, { radius: 78, duration: s.castFrames, label: 'PORTA', sigils: ['I', 'N', 'F', 'E', 'R', 'N', 'O'] });
    state.vfxSequences.push(makeHoldChannel({
      type: 'constante_portal',
      state: 0,
      age: 0,
      spell: s,
      cx: tx,
      cy: ty,
      castFrames: s.castFrames,
      demons: [],
      startX: state.player.x,
      startY: state.player.y,
    }, s, 'channel'));
    beginCastPose('channel', s.castFrames);
    SoundFX.playSweep(80, 260, 'sawtooth', 0.4, 0.45);
    return true;
  },

  isBrimstoneChain(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    pushCircle(s, ox, oy, { radius: 48, duration: s.castFrames, label: 'CHAIN', sigils: ['C', 'H', 'A', 'I', 'N'] });
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_chain', state: 0, age: 0, spell: s, ox, oy, tx, ty, links: [] }, s, 'channel'));
    beginCastPose('channel', s.castFrames);
    return true;
  },

  isAshenExorcism(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    const c = playerCenter();
    pushCircle(s, c.x, c.y + 16, { radius: s.exorcismR, duration: s.castFrames, label: 'ASH', sigils: ['A', 'S', 'H', 'X'] });
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_exorcism', state: 0, age: 0, spell: s, cx: c.x, cy: c.y, hit: false }, s, 'front_pose'));
    beginCastPose('front_pose', s.castFrames);
    return true;
  },

  isDemonSnare(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    pushCircle(s, tx, ty, { radius: s.snareR, duration: s.castFrames, label: 'SNARE', sigils: ['S', 'N', 'A', 'R', 'E'] });
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_snare', state: 0, age: 0, spell: s, cx: tx, cy: ty, armed: false }, s, 'slam'));
    beginCastPose('slam', s.castFrames);
    return true;
  },

  isCigaretteHex(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    pushCircle(s, ox, oy, { radius: 44, duration: s.castFrames, label: 'HEX', sigils: ['S', 'M', 'O', 'K', 'E'] });
    const target = nearestEnemy(tx, ty, s.hexR) || nearestEnemy(ox, oy, s.hexR);
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_cigarette_hex', state: 0, age: 0, spell: s, target, cx: tx, cy: ty, ticks: 0 }, s, 'thrust'));
    beginCastPose('thrust', s.castFrames);
    return true;
  },

  isDebtCollector(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    pushCircle(s, tx, ty, { radius: 58, duration: s.castFrames, label: 'DEBT', sigils: ['D', 'E', 'B', 'T'] });
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_debt_collector', state: 0, age: 0, spell: s, cx: tx, cy: ty, demon: null }, s, 'front_pose'));
    beginCastPose('front_pose', s.castFrames);
    return true;
  },

  isCrossroadBlink(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    pushCircle(s, tx, ty, { radius: 44, duration: s.castFrames, label: 'XROAD', sigils: ['N', 'E', 'S', 'W'] });
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_blink', state: 0, age: 0, spell: s, tx, ty, cx: tx, cy: ty, sx: state.player.x, sy: state.player.y }, s, 'thrust'));
    beginCastPose('thrust', s.castFrames);
    return true;
  },

  isLastRite(s, ox, oy, tx, ty) {
    if (!requireSigil(s, ox, oy)) return true;
    const c = playerCenter();
    pushCircle(s, c.x, c.y + 16, { radius: s.riteR, duration: s.castFrames, label: 'RITE', sigils: ['L', 'A', 'S', 'T', '7', '13'] });
    state.vfxSequences.push(makeHoldChannel({ type: 'constante_last_rite', state: 0, age: 0, spell: s, cx: c.x, cy: c.y, burst: false }, s, 'up'));
    beginCastPose('up', s.castFrames);
    SoundFX.playSweep(60, 420, 'sawtooth', 0.7, 0.5);
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {
  constante_ember(p, s) {
    if ((p.age || 0) % 2 === 0) spawnP(p.x, p.y, s.c2 || PAL.ember, 1, 'ember');
  },
  constante_smoke(p, s) {
    if ((p.age || 0) % 3 === 0) spawnP(p.x, p.y, s.color || PAL.smoke, 1, 'smoke');
  },
};

export const VFX_UPDATE = {
  constante_magic_circle(v) {
    if (v.age % 5 === 0) {
      const a = Math.random() * Math.PI * 2;
      spawnP(v.cx + Math.cos(a) * v.radius, v.cy + Math.sin(a) * v.radius * 0.55, v.fizzle ? '#aa3333' : v.spell.c2, 1, v.fizzle ? 'smoke' : 'sparkle');
    }
    if (v.age > (v.duration || 70)) v.done = true;
  },

  constante_spell_name(v) {
    if (v.age > 96) v.done = true;
  },

  constante_ward(v) {
    const s = v.spell;
    const p = state.player;
    if (!p) { v.done = true; return; }
    const c = playerCenter();
    v.cx = c.x;
    v.cy = c.y;
    const remaining = Math.max(0, s.wardDur - v.age);
    p.constanteWard = remaining;
    p.constanteWardR = s.wardR;
    beginCastPose('front_pose', Math.min(120, remaining));
    for (const ep of state.enemyProjectiles) {
      if (!ep || ep.life <= 0) continue;
      const d = Math.hypot(ep.x - c.x, ep.y - c.y);
      if (d < s.wardR + (ep.r || ep.spell?.r || 4)) {
        ep.life = 0;
        v.blocked++;
        spawnP(ep.x, ep.y, s.core, 8, 'sparkle');
        state.shake(3);
      }
    }
    if (v.age % 8 === 0) spawnP(c.x, c.y + 10, s.c2, 1, 'sparkle');
    state.dynamicLights.push({ x: c.x, y: c.y, r: s.wardR * 1.4, color: s.color, int: 0.65, life: 2, ml: 2 });
    if (remaining <= 0) {
      p.constanteWard = 0;
      spawnP(c.x, c.y, s.color, 12, 'smoke');
      v.done = true;
    }
  },

  constante_script(v) {
    const s = v.spell;
    const p = state.player;
    if (!p) { v.done = true; return; }
    p.constanteSlowFactor = s.slowFactor;
    applySlowField(s.slowFactor);
    beginCastPose('channel', 300);
    if (v.age % 3 === 0) {
      const a = (v.age * 0.23) % (Math.PI * 2);
      spawnP(v.cx + Math.cos(a) * 42, v.cy + Math.sin(a) * 23, s.core, 1, 'sparkle');
    }

    const mouse = state.mouse || {};
    const isDown = !!mouse.down;
    if (isDown) {
      const point = { x: mouse.x ?? v.cx, y: mouse.y ?? v.cy };
      if (!v.mouseWasDown) {
        resetScriptStroke(v);
        v.drawTarget = nearestScriptOption(point.x, point.y, v.options);
        v.lastPoint = point;
        v.stroke = [point];
      } else if (v.lastPoint) {
        const dx = point.x - v.lastPoint.x;
        const dy = point.y - v.lastPoint.y;
        const step = Math.hypot(dx, dy);
        if (step > 2) {
          v.strokeLength += step;
          v.stroke = [...(v.stroke || []), point].slice(-80);
          v.lastPoint = point;
          const nearest = nearestScriptOption(point.x, point.y, v.options);
          if (nearest) v.drawTarget = nearest;
        }
      }
    } else if (v.mouseWasDown) {
      const match = matchDrawnSigil(v.stroke, v.options, s.drawMinDistance || 86);
      if (match) {
        v.drawTarget = match.option;
        v.drawScore = match.score;
        finishScript(v, match.option.sigilKey);
        return;
      }
      v.drawTarget = null;
      resetScriptStroke(v);
      SoundFX.playTone(120, 'sawtooth', 0.08, 0.08);
    }
    v.mouseWasDown = isDown;

  },

  constante_portal(v) {
    const s = v.spell;
    const p = state.player;
    if (!p) { v.done = true; return; }
    if (v.state === 0) {
      const knocked = s.cancelOnKnockback && (Math.abs(p.vx || 0) > 3.2 || Math.abs(p.vy || 0) > 5.5);
      if (knocked) {
        cancelHoldChannel(v);
        SoundFX.playNoise(0.35, 0.22, 140, 'lowpass');
        return;
      }
      if (!continueHoldChannel(v, 'channel')) return;
      p.vx *= 0.82;
      if (v.age % 6 === 0) {
        const a = Math.random() * Math.PI * 2;
        spawnP(v.cx + Math.cos(a) * 80, v.cy + Math.sin(a) * 38, s.c2, 1, 'ember');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 110 + v.age * 0.12, color: s.color, int: 0.7, life: 2, ml: 2 });
      if (v.age > s.castFrames) {
        v.state = 1;
        v.age = 0;
        v.demons = [
          makeDemon(v.cx - 22, v.cy + 6, 'melee', s, 0),
          makeDemon(v.cx + 20, v.cy + 8, 'melee', s, 1),
          makeDemon(v.cx, v.cy - 14, 'ranged', s, 2),
        ];
        spawnP(v.cx, v.cy, s.core, 26, 'explode');
        state.shake(14);
      }
      return;
    }
    for (const d of v.demons) updateDemon(d, s);
    v.demons = v.demons.filter((d) => d.ally?.active);
    if (v.age > s.demonDur || v.demons.length === 0) {
      for (const d of v.demons) retireDemon(d);
      v.done = true;
    }
  },

  constante_chain(v) {
    const s = v.spell;
    if (v.state === 0) {
      if (!continueHoldChannel(v, 'channel', { refund: true })) return;
      if (v.age % 5 === 0) spawnP(v.ox, v.oy, s.c2, 1, 'ember');
      if (v.age > s.castFrames) {
        const targets = state.entities
          .filter((e) => isEnemyEntity(e))
          .map((e) => ({ e, d: Math.hypot(e.x + e.w / 2 - v.tx, e.y + e.h / 2 - v.ty) }))
          .filter((entry) => entry.d < s.chainR)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3);
        v.links = targets.map(({ e }) => bodyCenter(e));
        for (const { e } of targets) {
          const ec = bodyCenter(e);
          hurtEntity(e, s.dmg, v.ox, v.oy);
          e.vx += (v.ox - ec.x) * 0.04;
          e.vy += (v.oy - ec.y) * 0.025 - 1;
          spawnP(ec.x, ec.y, s.core, 10, 'ember');
        }
        state.shake(targets.length ? 7 : 2);
        v.state = 1;
        v.age = 0;
      }
      return;
    }
    if (v.age > 24) v.done = true;
  },

  constante_exorcism(v) {
    const s = v.spell;
    if (v.state === 0) {
      if (!continueHoldChannel(v, 'front_pose', { refund: true })) return;
      if (v.age % 6 === 0) spawnP(v.cx, v.cy, s.c2, 2, 'smoke');
      if (v.age > s.castFrames) {
        damageInRadius(v.cx, v.cy, s.exorcismR, s.dmg, s.core, 13);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.exorcismR, life: 18, maxLife: 18, color: s.core });
        state.shake(10);
        v.state = 1;
        v.age = 0;
      }
      return;
    }
    if (v.age > 28) v.done = true;
  },

  constante_snare(v) {
    const s = v.spell;
    if (v.state === 0) {
      if (!continueHoldChannel(v, 'slam', { refund: true })) return;
      if (v.age > s.castFrames) {
        v.state = 1;
        v.age = 0;
        v.armed = true;
        SoundFX.playSweep(240, 80, 'sawtooth', 0.22, 0.18);
      }
      return;
    }
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      const ec = bodyCenter(e);
      const d = Math.hypot(ec.x - v.cx, ec.y - v.cy);
      if (d < s.snareR) {
        e.vx *= 0.55;
        e.vy *= 0.7;
        if (v.age % 26 === 0) hurtEntity(e, s.dmg, v.cx, v.cy);
        state.frozenEntities.set(e, Math.max(state.frozenEntities.get(e) || 0, 8));
      }
    }
    if (v.age % 10 === 0) spawnP(v.cx + (Math.random() - 0.5) * s.snareR, v.cy + (Math.random() - 0.5) * s.snareR * 0.5, s.c2, 1, 'ember');
    if (v.age > s.snareDur) v.done = true;
  },

  constante_cigarette_hex(v) {
    const s = v.spell;
    if (v.state === 0) {
      if (!continueHoldChannel(v, 'thrust', { refund: true })) return;
      if (v.age > s.castFrames) {
        if (!v.target || !v.target.active) v.target = nearestEnemy(v.cx, v.cy, s.hexR);
        v.state = 1;
        v.age = 0;
      }
      return;
    }
    if (!v.target || !v.target.active || v.age > s.hexDur) { v.done = true; return; }
    const tc = bodyCenter(v.target);
    v.cx += (tc.x - v.cx) * 0.08;
    v.cy += (tc.y - v.cy - 10) * 0.08;
    v.target.vx *= 0.88;
    if (v.age % 32 === 0) {
      hurtEntity(v.target, s.dmg, v.cx, v.cy);
      spawnP(tc.x, tc.y - 8, s.core, 8, 'smoke');
    }
    if (v.age % 5 === 0) spawnP(v.cx, v.cy, s.color, 1, 'smoke');
  },

  constante_debt_collector(v) {
    const s = v.spell;
    if (v.state === 0) {
      if (!continueHoldChannel(v, 'front_pose', { refund: true })) return;
      if (v.age > s.castFrames) {
        v.demon = makeDemon(v.cx, v.cy, 'melee', s, 0);
        v.demon.ally.type = 'ally-constante-debt-collector';
        v.state = 1;
        v.age = 0;
        spawnP(v.cx, v.cy, s.c2, 18, 'smoke');
      }
      return;
    }
    if (!v.demon || !updateDemon(v.demon, s) || v.age > s.demonDur) {
      if (v.demon) retireDemon(v.demon);
      v.done = true;
    }
  },

  constante_blink(v) {
    const s = v.spell;
    const p = state.player;
    if (!p) { v.done = true; return; }
    if (!continueHoldChannel(v, 'thrust', { refund: true })) return;
    if (v.age % 4 === 0) spawnP(p.x + p.w / 2, p.y + p.h / 2, s.c2, 1, 'smoke');
    if (v.age > s.castFrames) {
      const pc = playerCenter();
      const dx = v.tx - pc.x;
      const dy = v.ty - pc.y;
      const dist = Math.hypot(dx, dy) || 1;
      const step = Math.min(dist, s.blinkRange);
      p.x = Math.max(10, Math.min(state.W - p.w - 10, p.x + (dx / dist) * step));
      p.y = Math.max(20, Math.min(state.H - p.h - 20, p.y + (dy / dist) * step));
      p.vx = (dx / dist) * 3;
      p.vy = (dy / dist) * 1.5 - 1;
      spawnP(v.sx + p.w / 2, v.sy + p.h / 2, s.color, 12, 'smoke');
      spawnP(p.x + p.w / 2, p.y + p.h / 2, s.core, 12, 'sparkle');
      v.done = true;
    }
  },

  constante_last_rite(v) {
    const s = v.spell;
    const p = state.player;
    if (!p) { v.done = true; return; }
    if (!v.burst && !continueHoldChannel(v, v.age < s.castFrames ? 'up' : 'slam', { refund: true })) return;
    if (v.burst) beginCastPose('slam', 120);
    p.vx *= 0.75;
    if (v.age % 8 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = s.riteR * (0.4 + Math.random() * 0.6);
      spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.45, v.age % 16 === 0 ? s.c2 : PAL.hell, 1, 'ember');
    }
    if (!v.burst && v.age > s.castFrames) {
      v.burst = true;
      damageInRadius(v.cx, v.cy, s.riteR, s.dmg, s.core, 20);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.riteR, life: 30, maxLife: 30, color: s.c2 });
      state.shake(38);
      spawnP(v.cx, v.cy, s.core, 34, 'explode');
      SoundFX.playNoise(1, 0.55, 95, 'lowpass');
    }
    if (v.burst && v.age > s.castFrames + 70) v.done = true;
  },
};

function drawMagicCircle(X, v, alpha = 1) {
  const s = v.spell || { color: PAL.coat, c2: PAL.paper, core: '#ffffff' };
  const r = v.radius || 48;
  const pulse = 1 + Math.sin(v.age * 0.18) * 0.035;
  const fade = Math.max(0, 1 - v.age / ((v.duration || 70) + 20));
  X.save();
  X.translate(v.cx, v.cy);
  X.scale(1, 0.58);
  X.globalAlpha = alpha * Math.min(1, fade + 0.2);
  X.strokeStyle = v.fizzle ? '#aa3333' : s.c2;
  X.lineWidth = v.fizzle ? 2 : 1.6;
  X.beginPath();
  X.arc(0, 0, r * pulse, 0, Math.PI * 2);
  X.stroke();
  X.globalAlpha *= 0.65;
  X.beginPath();
  X.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  X.stroke();
  X.globalAlpha *= 0.8;
  X.strokeStyle = s.core;
  X.setLineDash([4, 6]);
  X.beginPath();
  X.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  X.stroke();
  X.setLineDash([]);
  const glyphs = v.sigils || CIRCLE_SIGILS;
  X.font = 'bold 8px monospace';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  for (let i = 0; i < glyphs.length; i++) {
    const a = (i / glyphs.length) * Math.PI * 2 + v.age * 0.025;
    X.save();
    X.rotate(a);
    X.translate(r * 0.82, 0);
    X.rotate(Math.PI / 2);
    X.fillStyle = i % 2 ? s.core : s.c2;
    X.fillText(glyphs[i], 0, 0);
    X.restore();
  }
  if (v.label) {
    X.globalAlpha = alpha * 0.45;
    X.fillStyle = s.core;
    X.font = 'bold 9px monospace';
    X.fillText(v.label, 0, 0);
  }
  X.restore();
  X.globalAlpha = 1;
}

function drawDemon(X, d, s) {
  const bob = Math.sin((d.age || 0) * 0.18) * 2;
  X.save();
  X.translate(d.x, d.y + bob);
  X.scale(d.facing || 1, 1);
  X.globalAlpha = 0.22;
  X.fillStyle = '#000';
  X.beginPath();
  X.ellipse(0, 18, d.role === 'ranged' ? 9 : 12, 4, 0, 0, Math.PI * 2);
  X.fill();
  X.globalAlpha = 1;
  X.strokeStyle = PAL.void;
  X.lineWidth = 3;
  X.beginPath();
  X.moveTo(0, -10);
  X.lineTo(0, 10);
  X.stroke();
  X.fillStyle = d.role === 'ranged' ? '#3b2520' : s.color;
  X.fillRect(-7, -7, 14, 17);
  X.fillStyle = s.c2;
  X.fillRect(-5, -4, 10, 3);
  X.fillStyle = '#24130f';
  X.fillRect(-6, -17, 12, 9);
  X.fillStyle = s.core;
  X.fillRect(-3, -14, 2, 2);
  X.fillRect(2, -14, 2, 2);
  X.strokeStyle = s.core;
  X.lineWidth = 1.4;
  X.beginPath();
  X.moveTo(-4, -17);
  X.lineTo(-9, -23);
  X.moveTo(4, -17);
  X.lineTo(9, -23);
  X.stroke();
  if (d.role === 'melee') {
    X.strokeStyle = s.c2;
    X.beginPath();
    X.moveTo(7, -2);
    X.lineTo(16, 8);
    X.stroke();
  } else {
    X.fillStyle = s.core;
    X.fillRect(8, -5, 8, 3);
  }
  X.restore();
}

function drawCastProgress(X, v, radius) {
  const s = v.spell;
  const frames = v.castFrames || s.castFrames || 300;
  const pct = Math.max(0, Math.min(1, v.age / frames));
  X.save();
  X.strokeStyle = s.core;
  X.lineWidth = 3;
  X.globalAlpha = 0.75;
  X.beginPath();
  X.arc(v.cx, v.cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  X.stroke();
  X.restore();
}

function drawSigilShape(X, option, radius = 18) {
  const points = option.template || [];
  if (points.length < 2) return;
  X.save();
  X.strokeStyle = option.core || '#ffffff';
  X.lineWidth = 2.4;
  X.lineCap = 'round';
  X.lineJoin = 'round';
  X.beginPath();
  X.moveTo(option.x + points[0].x * radius, option.y + points[0].y * radius);
  for (const point of points.slice(1)) {
    X.lineTo(option.x + point.x * radius, option.y + point.y * radius);
  }
  if (option.closed) X.closePath();
  X.stroke();
  X.globalAlpha *= 0.32;
  X.lineWidth = 7;
  X.stroke();
  X.restore();
}

function drawChannelWriting(X, v, radius = 28) {
  const sigil = v.writerSigil;
  const points = sigil?.template || [];
  if (points.length < 2) return;
  const p = state.player;
  const x = p ? p.x + p.w / 2 + (p.facing || 1) * 22 : (v.ox ?? v.cx ?? 0);
  const y = p ? p.y - 18 : (v.oy ?? v.cy ?? 0) - 30;
  const progress = Math.max(0.04, Math.min(1, v.writerProgress ?? v.holdProgress ?? 0));
  const totalSegments = points.length - 1;
  const drawnSegments = progress * totalSegments;
  const fullSegments = Math.floor(drawnSegments);
  const partial = drawnSegments - fullSegments;

  X.save();
  X.translate(x, y);
  X.globalAlpha = 0.85;
  X.strokeStyle = v.spell?.core || '#ffffff';
  X.lineWidth = 2.8;
  X.lineCap = 'round';
  X.lineJoin = 'round';
  X.shadowColor = v.spell?.c2 || PAL.coat;
  X.shadowBlur = 10;
  X.beginPath();
  X.moveTo(points[0].x * radius, points[0].y * radius);
  for (let i = 1; i <= fullSegments && i < points.length; i++) {
    X.lineTo(points[i].x * radius, points[i].y * radius);
  }
  if (fullSegments + 1 < points.length) {
    const a = points[fullSegments];
    const b = points[fullSegments + 1];
    X.lineTo((a.x + (b.x - a.x) * partial) * radius, (a.y + (b.y - a.y) * partial) * radius);
  }
  X.stroke();

  const tipIndex = Math.min(points.length - 2, Math.max(0, fullSegments));
  const tipA = points[tipIndex];
  const tipB = points[tipIndex + 1] || tipA;
  const qx = (tipA.x + (tipB.x - tipA.x) * partial) * radius;
  const qy = (tipA.y + (tipB.y - tipA.y) * partial) * radius;
  X.shadowBlur = 14;
  X.fillStyle = v.spell?.c2 || PAL.paper;
  X.beginPath();
  X.arc(qx, qy, 4, 0, Math.PI * 2);
  X.fill();

  X.shadowBlur = 0;
  X.globalAlpha = 0.45;
  X.strokeStyle = v.spell?.c2 || PAL.coat;
  X.beginPath();
  X.arc(0, 0, radius + 10, 0, Math.PI * 2 * progress);
  X.stroke();
  X.globalAlpha = 0.75;
  X.fillStyle = v.spell?.core || '#ffffff';
  X.font = 'bold 7px monospace';
  X.textAlign = 'center';
  X.fillText(v.writerLabel || '', 0, radius + 20);
  X.restore();
}

export const VFX_DRAW = {
  constante_magic_circle(v, X) {
    drawMagicCircle(X, v, v.fizzle ? 0.65 : 0.85);
  },

  constante_spell_name(v, X) {
    const life = Math.max(0, 1 - v.age / 96);
    X.save();
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.globalAlpha = Math.min(1, life * 1.4);
    X.font = 'bold 16px monospace';
    X.fillStyle = '#050302';
    X.fillText(String(v.text || '').toUpperCase(), v.x + 2, v.y + 2);
    X.fillStyle = v.color || '#ffffff';
    X.fillText(String(v.text || '').toUpperCase(), v.x, v.y);
    X.globalAlpha *= 0.45;
    X.font = '8px monospace';
    X.fillStyle = v.c2 || PAL.coat;
    X.fillText('SIGILO CONCLUIDO', v.x, v.y + 20);
    X.restore();
  },

  constante_ward(v, X) {
    const s = v.spell;
    const life = Math.max(0, (s.wardDur - v.age) / s.wardDur);
    X.save();
    X.globalAlpha = 0.22 + life * 0.35;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.arc(v.cx, v.cy, s.wardR * (1 + Math.sin(v.age * 0.14) * 0.04), 0, Math.PI * 2);
    X.stroke();
    X.globalAlpha = 0.14;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(v.cx, v.cy, s.wardR, 0, Math.PI * 2);
    X.fill();
    X.globalAlpha = 1;
    X.fillStyle = s.core;
    X.font = 'bold 8px monospace';
    X.textAlign = 'center';
    X.fillText(`${Math.ceil((s.wardDur - v.age) / 60)}s`, v.cx, v.cy - s.wardR - 8);
    X.restore();
  },

  constante_script(v, X) {
    const s = v.spell;
    X.save();
    X.globalAlpha = 0.52;
    X.fillStyle = '#050302';
    X.fillRect(0, 0, state.W, state.H);
    X.globalAlpha = 1;
    X.fillStyle = s.core;
    X.font = 'bold 9px monospace';
    X.textAlign = 'center';
    X.fillText('SEGURE O MOUSE E TRACE UM SIGILO', state.W / 2, 24);
    X.fillStyle = s.c2;
    X.font = '7px monospace';
    X.fillText('realidade em 5% de velocidade', state.W / 2, 39);
    for (const option of v.options || []) {
      const active = v.drawTarget?.sigilKey === option.sigilKey;
      const unlocked = ensureSigilSet().has(option.sigilKey);
      drawMagicCircle(
        X,
        {
          ...v,
          cx: option.x,
          cy: option.y,
          radius: active ? 30 : 25,
          label: option.label,
          sigils: option.glyphs,
          spell: { color: option.color, c2: option.c2, core: option.core },
          duration: s.writeFrames,
        },
        unlocked ? 0.35 : active ? 1 : 0.72,
      );
      X.globalAlpha = unlocked ? 0.28 : active ? 1 : 0.82;
      drawSigilShape(X, option, active ? 21 : 17);
      X.globalAlpha = unlocked ? 0.42 : 0.9;
      X.fillStyle = option.core;
      X.font = '6px monospace';
      X.fillText(option.label, option.x, option.y + 34);
      X.globalAlpha = 1;
    }
    if ((v.stroke || []).length > 1) {
      X.strokeStyle = v.drawTarget?.core || s.core;
      X.lineWidth = 3;
      X.globalAlpha = 0.9;
      X.beginPath();
      X.moveTo(v.stroke[0].x, v.stroke[0].y);
      for (const point of v.stroke.slice(1)) X.lineTo(point.x, point.y);
      X.stroke();
      X.globalAlpha = 0.35;
      X.lineWidth = 8;
      X.stroke();
    }
    X.restore();
    drawMagicCircle(X, { ...v, radius: 66, duration: s.writeFrames, label: 'SCRIPT' }, 0.8);
  },

  constante_portal(v, X) {
    const s = v.spell;
    drawMagicCircle(X, { ...v, radius: 78, label: v.state === 0 ? '8s' : 'OPEN', duration: s.castFrames }, 0.9);
    X.save();
    X.translate(v.cx, v.cy);
    X.scale(1, 0.58);
    const r = v.state === 0 ? 16 + (v.age / s.castFrames) * 54 : 70 + Math.sin(v.age * 0.12) * 5;
    const g = X.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.55, s.color + 'cc');
    g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.beginPath();
    X.arc(0, 0, r, 0, Math.PI * 2);
    X.fill();
    X.restore();
    if (v.state === 0) drawCastProgress(X, v, 88);
    for (const d of v.demons || []) drawDemon(X, d, s);
  },

  constante_chain(v, X) {
    drawChannelWriting(X, v);
    drawMagicCircle(X, { ...v, cx: v.ox, cy: v.oy, radius: 48, duration: v.spell.castFrames }, 0.65);
    X.save();
    X.strokeStyle = v.spell.c2;
    X.lineWidth = 2;
    X.globalAlpha = 0.75;
    const links = v.links.length ? v.links : [{ x: v.tx, y: v.ty }];
    for (const link of links) {
      X.beginPath();
      X.moveTo(v.ox, v.oy);
      X.lineTo(link.x, link.y);
      X.stroke();
    }
    X.restore();
  },

  constante_exorcism(v, X) {
    drawChannelWriting(X, v);
    drawMagicCircle(X, { ...v, radius: v.spell.exorcismR, duration: v.spell.castFrames, label: 'ASH' }, 0.55);
    if (v.state === 1) {
      X.save();
      X.globalAlpha = Math.max(0, 1 - v.age / 28) * 0.35;
      X.fillStyle = v.spell.core;
      X.beginPath();
      X.arc(v.cx, v.cy, v.spell.exorcismR * (v.age / 28), 0, Math.PI * 2);
      X.fill();
      X.restore();
    }
  },

  constante_snare(v, X) {
    drawChannelWriting(X, v);
    drawMagicCircle(X, { ...v, radius: v.spell.snareR, duration: v.spell.castFrames, label: v.armed ? 'TRAP' : 'SNARE' }, v.armed ? 0.7 : 0.5);
  },

  constante_cigarette_hex(v, X) {
    drawChannelWriting(X, v);
    X.save();
    X.strokeStyle = v.spell.c2;
    X.globalAlpha = 0.6;
    X.setLineDash([2, 5]);
    X.beginPath();
    X.arc(v.cx, v.cy, 18 + Math.sin(v.age * 0.2) * 4, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);
    X.fillStyle = v.spell.core;
    X.fillRect(v.cx - 2, v.cy - 2, 4, 4);
    X.restore();
  },

  constante_debt_collector(v, X) {
    drawChannelWriting(X, v);
    drawMagicCircle(X, { ...v, radius: 58, duration: v.spell.castFrames, label: 'DEBT' }, 0.55);
    if (v.demon) drawDemon(X, v.demon, v.spell);
  },

  constante_blink(v, X) {
    drawChannelWriting(X, v);
    drawMagicCircle(X, { ...v, cx: v.tx, cy: v.ty, radius: 44, duration: v.spell.castFrames, label: 'X' }, 0.55);
  },

  constante_last_rite(v, X) {
    drawChannelWriting(X, v, 34);
    drawMagicCircle(X, { ...v, radius: v.spell.riteR, duration: v.spell.castFrames, label: 'LAST' }, 0.6);
    if (v.burst) {
      X.save();
      X.globalAlpha = Math.max(0, 1 - (v.age - v.spell.castFrames) / 70) * 0.5;
      X.strokeStyle = v.spell.core;
      X.lineWidth = 4;
      X.beginPath();
      X.arc(v.cx, v.cy, v.spell.riteR, 0, Math.PI * 2);
      X.stroke();
      X.restore();
    }
  },
};
