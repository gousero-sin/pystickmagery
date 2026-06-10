// ═══════════════════════════════════════════════════════════════════════════
// tensorveil.js — Tensorveil Spell School
//
// Theme:
//   Matrix-like vector manipulation, inertia decomposition and cinematic
//   momentum choreography. Designed to feel radically different from
//   resonance/elemental schools.
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
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

function sideVector(vx, vy) {
  const len = Math.hypot(vx, vy) || 1;
  return { x: -vy / len, y: vx / len };
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

function nearestEnemy(x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const d = Math.hypot(ex - x, ey - y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function applyMatrixToVelocity(body, m00, m01, m10, m11, cap = 16) {
  const vx = body.vx || 0;
  const vy = body.vy || 0;
  const nvx = m00 * vx + m01 * vy;
  const nvy = m10 * vx + m11 * vy;
  body.vx = Math.max(-cap, Math.min(cap, nvx));
  body.vy = Math.max(-cap, Math.min(cap, nvy));
}

function rememberMomentum(map, obj, scale = 1) {
  if (!map.has(obj)) map.set(obj, { vx: 0, vy: 0 });
  const bag = map.get(obj);
  bag.vx += (obj.vx || 0) * scale;
  bag.vy += (obj.vy || 0) * scale;
}

const PALETTE = {
  color: '#9dff5a',
  c2: '#52f3ff',
  core: '#ffffff',
};

export const SPELL_DEFS = [
  {
    name: 'Eigen Spike',
    icon: '🧬',
    key: '1',
    category: 'Ray',
    color: PALETTE.color,
    c2: PALETTE.c2,
    core: PALETTE.core,
    speed: 15,
    dmg: 0,
    mana: 14,
    cd: 230,
    r: 3,
    grav: 0,
    drag: 0.999,
    bounce: 1,
    exR: 42,
    exF: 9,
    trail: 'tensor_eigen',
    isTensorveilRay: true,
    turnRate: 0.018,
    desc: 'A self-rotating vector spike that side-launches targets on puncture.',
  },

  {
    name: 'Null Axis',
    icon: '⊣',
    key: '2',
    category: 'Hold',
    color: '#94ff5f',
    c2: '#5be7ff',
    core: '#ffffff',
    speed: 0,
    dmg: 4,
    mana: 20,
    cd: 980,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilHold: true,
    holdR: 92,
    holdDrain: 0.24,
    axisForce: 0.32,
    releaseR: 108,
    releaseDmg: 28,
    desc: 'Channels an axis field that rotates local velocity tensors, then detonates determinant stress.',
  },

  {
    name: 'Jacobian Idol',
    icon: '🗿',
    key: '3',
    category: 'Summon',
    color: '#98ff67',
    c2: '#53efff',
    core: '#ffffff',
    speed: 0,
    dmg: 10,
    mana: 30,
    cd: 1500,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilSummon: true,
    summonDur: 410,
    summonR: 170,
    pulseEvery: 26,
    desc: 'A tensor idol that alternates compress/expand pulses and mirrors nearby projectile vectors.',
  },

  {
    name: 'Determinant Slice',
    icon: '✣',
    key: '4',
    category: 'Cast',
    color: '#97ff66',
    c2: '#4be7ff',
    core: '#ffffff',
    speed: 0,
    dmg: 33,
    mana: 24,
    cd: 720,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilCast: true,
    sliceLen: 190,
    sliceW: 24,
    desc: 'Instant cross-shear that cuts along two tensor diagonals and bends impact vectors.',
  },

  {
    name: 'Singular Vector',
    icon: '⬗',
    key: '5',
    category: 'Charge',
    color: '#a1ff6c',
    c2: '#62eeff',
    core: '#ffffff',
    speed: 0,
    dmg: 28,
    mana: 28,
    cd: 1320,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilCharge: true,
    maxCharge: 115,
    chargeDrain: 0.22,
    desc: 'Charge a singular axis and release a vector bolt with anisotropic impact.',
  },

  {
    name: 'Permutation Step',
    icon: '⇄',
    key: '6',
    category: 'Dash',
    color: '#98ff69',
    c2: '#5ff0ff',
    core: '#ffffff',
    speed: 0,
    dmg: 0,
    mana: 18,
    cd: 820,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilDash: true,
    dashMax: 220,
    dashWidth: 36,
    desc: 'Permutation dash that can swap positions with struck targets and leaves replay echoes.',
  },

  {
    name: 'Parity Gate',
    icon: '⛩️',
    key: '7',
    category: 'Manifest',
    color: '#9bff73',
    c2: '#5be8ff',
    core: '#ffffff',
    speed: 0,
    dmg: 8,
    mana: 26,
    cd: 980,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilManifest: true,
    maxLen: 320,
    dur: 720,
    gateW: 34,
    pulseEvery: 14,
    desc: 'Two-point manifest gate that boosts co-directional flow and reflects opposite flow.',
  },

  {
    name: 'Tensor Chorus',
    icon: '🕸️',
    key: '8',
    category: 'Ultimate',
    color: '#a8ff78',
    c2: '#5ce8ff',
    core: '#ffffff',
    speed: 0,
    dmg: 96,
    mana: 86,
    cd: 9200,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilUltimate: true,
    fieldR: 300,
    desc: 'Creates a tensor choir domain that remaps velocities before collapsing into a matrix break.',
  },

  {
    name: 'Rank Collapse',
    icon: '🧯',
    key: '9',
    category: 'Ultimate (Adicional)',
    color: '#b3ff80',
    c2: '#61eeff',
    core: '#ffffff',
    speed: 0,
    dmg: 122,
    mana: 95,
    cd: 11200,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'tensor',
    isTensorveilUltimate2: true,
    muteDur: 200,
    desc: 'Decomposes world momentum into orthogonal ranks, then releases one catastrophic axis.',
  },
];

export const FIRE_HANDLERS = {
  isTensorveilHold(s, ox, oy, tx, ty) {
    const active = state.vfxSequences.find((v) => v.type === 'tensor_hold' && v.state === 0);
    if (active) {
      active.state = 1;
      active.age = 0;
      return true;
    }

    const p = clampScenePoint(tx, ty, Math.max(24, (s.holdR || 90) * 0.32));
    state.vfxSequences.push({
      type: 'tensor_hold',
      state: 0,
      age: 0,
      spell: s,
      cx: p.x,
      cy: p.y,
      ox,
      oy,
      phase: Math.random() * Math.PI * 2,
      stress: new Map(),
      touched: [],
      prep: 1,
    });
    SoundFX.playSweep(150, 860, 'triangle', 0.14, 0.12);
    spawnP(p.x, p.y, s.c2, 8, 'sparkle');
    return true;
  },

  isTensorveilSummon(s, ox, oy, tx, ty) {
    const p = clampScenePoint(tx, ty, 56);
    state.vfxSequences.push({
      type: 'tensor_summon',
      state: 0,
      age: 0,
      spell: s,
      cx: p.x,
      cy: p.y,
      life: s.summonDur,
      phase: Math.random() * Math.PI * 2,
      mode: 'compress',
      pulses: [],
      reflected: [],
    });
    SoundFX.playSweep(120, 980, 'triangle', 0.24, 0.18);
    spawnP(p.x, p.y, s.color, 10, 'burst');
    return true;
  },

  isTensorveilCast(s, ox, oy, tx, ty) {
    const c = clampScenePoint(tx, ty, 30);
    const p = casterOrigin();
    const aim = Math.atan2(c.y - p.y, c.x - p.x);
    state.vfxSequences.push({
      type: 'tensor_cast_slice',
      state: 0,
      age: 0,
      spell: s,
      cx: c.x,
      cy: c.y,
      a1: aim + Math.PI / 4,
      a2: aim - Math.PI / 4,
      fired: false,
      phase: Math.random() * Math.PI * 2,
    });
    SoundFX.playSweep(300, 1100, 'square', 0.18, 0.1);
    return true;
  },

  isTensorveilCharge(s) {
    const active = state.vfxSequences.find((v) => v.type === 'tensor_charge' && v.state === 0);
    if (active) {
      active.state = 1;
      active.age = 0;
      return true;
    }

    const o = casterOrigin();
    state.vfxSequences.push({
      type: 'tensor_charge',
      state: 0,
      age: 0,
      spell: s,
      charge: 0,
      ox: o.x,
      oy: o.y,
      phase: Math.random() * Math.PI * 2,
    });
    SoundFX.playSweep(100, 640, 'sine', 0.2, 0.2);
    return true;
  },

  isTensorveilDash(s, ox, oy, tx, ty) {
    const px = state.player.x + state.player.w / 2;
    const py = state.player.y + state.player.h / 2;
    const dx = tx - px;
    const dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.min(s.dashMax || 220, len);
    const nx = dx / len;
    const ny = dy / len;
    const end = clampScenePoint(px + nx * dist, py + ny * dist, 20);

    let bestSwap = null;
    let bestScore = Infinity;

    for (const e of state.entities) {
      if (!e.active) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const hit = distToSegment(ex, ey, px, py, end.x, end.y);
      if (hit.dist > (s.dashWidth || 36)) continue;
      const k = Math.max(0.2, 1 - hit.dist / (s.dashWidth || 36));
      e.vx += nx * (10 * k) / (e.mass || 1);
      e.vy += ny * (6 * k) / (e.mass || 1) - 0.8;
      if (hit.dist < bestScore) {
        bestScore = hit.dist;
        bestSwap = e;
      }
    }

    const oldX = state.player.x;
    const oldY = state.player.y;
    state.player.x = end.x - state.player.w / 2;
    state.player.y = end.y - state.player.h / 2;
    state.player.vx = nx * 6;
    state.player.vy = ny * 4;

    if (bestSwap) {
      const sx = bestSwap.x;
      const sy = bestSwap.y;
      bestSwap.x = oldX;
      bestSwap.y = oldY;
      state.player.x = sx;
      state.player.y = sy;
      spawnP(bestSwap.x + bestSwap.w / 2, bestSwap.y + bestSwap.h / 2, s.c2, 8, 'sparkle');
      SoundFX.playTone(980, 'triangle', 0.08, 0.06);
    }

    state.vfxSequences.push({
      type: 'tensor_dash',
      state: 0,
      age: 0,
      spell: s,
      x1: px,
      y1: py,
      x2: end.x,
      y2: end.y,
      phase: Math.random() * Math.PI * 2,
      echoes: [
        { x: px, y: py, life: 10, ml: 10 },
        { x: (px + end.x) * 0.5, y: (py + end.y) * 0.5, life: 12, ml: 12 },
      ],
    });

    state.shockwaves.push({ x: end.x, y: end.y, r: 0, maxR: 56, life: 9, maxLife: 9, color: s.c2 });
    state.dynamicLights.push({ x: end.x, y: end.y, r: 105, color: s.core, int: 1.8, life: 7, ml: 7 });
    SoundFX.playSweep(1450, 280, 'triangle', 0.2, 0.08);
    state.shake(7);
    return true;
  },

  isTensorveilManifest(s, ox, oy, tx, ty, idx) {
    const stale = state.tensorveilManifestDraft;
    if (stale && (!stale.vfx || !state.vfxSequences.includes(stale.vfx))) state.tensorveilManifestDraft = null;

    const draft = state.tensorveilManifestDraft;
    if (draft && draft.spellIdx === idx) {
      const dx = tx - draft.x1;
      const dy = ty - draft.y1;
      const len = Math.hypot(dx, dy) || 1;
      const maxLen = s.maxLen || 320;
      const nx = dx / len;
      const ny = dy / len;
      const x2 = draft.x1 + nx * Math.min(len, maxLen);
      const y2 = draft.y1 + ny * Math.min(len, maxLen);

      if (draft.vfx) removeVfx(draft.vfx);
      state.tensorveilManifestDraft = null;

      state.vfxSequences.push({
        type: 'tensor_manifest_gate',
        state: 0,
        age: 0,
        spell: s,
        x1: draft.x1,
        y1: draft.y1,
        x2,
        y2,
        life: s.dur,
        phase: Math.random() * Math.PI * 2,
        pulses: [],
      });

      spawnP(x2, y2, s.c2, 8, 'sparkle');
      SoundFX.playSweep(200, 900, 'triangle', 0.2, 0.14);
      return true;
    }

    const p = clampScenePoint(tx, ty, 26);
    const anchor = { type: 'tensor_manifest_anchor', state: 0, age: 0, cx: p.x, cy: p.y, spell: s, phase: Math.random() * Math.PI * 2 };
    state.tensorveilManifestDraft = { spellIdx: idx, x1: p.x, y1: p.y, vfx: anchor };
    state.vfxSequences.push(anchor);
    state.refundSpellCast?.(idx, s.mana);
    spawnP(p.x, p.y, s.color, 6, 'burst');
    SoundFX.playTone(460, 'sine', 0.1, 0.08);
    return true;
  },

  isTensorveilUltimate(s, ox, oy, tx, ty) {
    const c = clampScenePoint(tx, ty, 70);
    state.vfxSequences.push({
      type: 'tensor_ultimate_chorus',
      state: 0,
      age: 0,
      spell: s,
      cx: c.x,
      cy: c.y,
      phase: Math.random() * Math.PI * 2,
      rings: [],
      anchors: [0, 1, 2, 3].map((i) => ({ a: (i / 4) * Math.PI * 2, r: 70 + Math.random() * 20 })),
      strain: new Map(),
      prevInv: !!state.player.inv,
      exploded: false,
    });
    state.player.inv = true;
    SoundFX.playSweep(110, 700, 'sine', 0.42, 0.55);
    state.shake(5);
    return true;
  },

  isTensorveilUltimate2(s) {
    state.vfxSequences.push({
      type: 'tensor_ultimate_rank',
      state: 0,
      age: 0,
      spell: s,
      cx: state.W * 0.5,
      cy: state.H * 0.48,
      phase: Math.random() * Math.PI * 2,
      stored: new Map(),
      storedProj: new Map(),
      pulses: [],
      axis: Math.random() > 0.5 ? 'x' : 'y',
      prevInv: !!state.player.inv,
      exploded: false,
    });
    state.player.inv = true;
    SoundFX.playTone(90, 'sine', 0.34, 0.45);
    SoundFX.playSweep(2100, 170, 'triangle', 0.18, 0.42);
    state.shake(7);
    return true;
  },
};

export const PROJ_HOOKS = {
  isTensorveilRay: {
    onUpdate(p, s) {
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const a = Math.atan2(p.vy, p.vx) + (s.turnRate || 0.018) * (1 + (p.age || 0) * 0.005);
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;

      if ((p.age || 0) % 2 === 0) spawnP(p.x, p.y, Math.random() > 0.5 ? s.c2 : s.color, 1, 'trail');
      if ((p.age || 0) % 5 === 0) state.dynamicLights.push({ x: p.x, y: p.y, r: 28, color: s.core, int: 1.05, life: 2, ml: 2 });
    },
    onLand(p, s) {
      const sv = sideVector(p.vx, p.vy);
      explode(p.x, p.y, s.exR, s.exF, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: s.exR * 1.35, life: 10, maxLife: 10, color: s.core });
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const d = Math.hypot(ex - p.x, ey - p.y);
        if (d > s.exR * 1.2) continue;
        const k = Math.max(0, 1 - d / (s.exR * 1.2));
        e.vx += sv.x * 12 * k / (e.mass || 1);
        e.vy += sv.y * 9 * k / (e.mass || 1) - 0.9;
      }
      SoundFX.playSweep(1400, 230, 'sawtooth', 0.16, 0.09);
      return true;
    },
  },

  isTensorveilSingularShot: {
    onUpdate(p, s) {
      const sx = Math.abs(s.axisX || 1);
      const sy = Math.abs(s.axisY || 1);
      p.vx *= 1 + 0.004 * sx;
      p.vy *= 1 + 0.004 * sy;

      if ((p.age || 0) % 2 === 0) spawnP(p.x, p.y, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
      if ((p.age || 0) % 6 === 0) state.dynamicLights.push({ x: p.x, y: p.y, r: 30, color: s.core, int: 1.2, life: 2, ml: 2 });
    },
    onLand(p, s) {
      explode(p.x, p.y, s.exR || 90, s.exF || 13, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: (s.exR || 90) * 1.3, life: 12, maxLife: 12, color: s.c2 });
      SoundFX.playSweep(1750, 190, 'sawtooth', 0.22, 0.12);
      return true;
    },
  },
};

export const TRAIL_EMITTERS = {
  tensor_eigen(p, s) {
    if ((p.age || 0) % 2 !== 0) return;
    state.particles.push({
      x: p.x,
      y: p.y,
      vx: -p.vx * 0.1 + (Math.random() - 0.5) * 0.3,
      vy: -p.vy * 0.1 + (Math.random() - 0.5) * 0.3,
      life: 15,
      ml: 15,
      color: Math.random() > 0.5 ? s.color : s.c2,
      size: 1.3,
      grav: 0,
      type: 'trail',
    });
  },
};

function updateTensorHold(v) {
  const s = v.spell;
  const o = casterOrigin();
  v.ox = o.x;
  v.oy = o.y;
  v.phase += 0.1;

  if (v.state === 0) {
    if (!state.mouse?.down) {
      v.state = 1;
      v.age = 0;
      return;
    }

    const n = clampScenePoint(state.mouse.x, state.mouse.y, Math.max(24, (s.holdR || 90) * 0.32));
    v.cx += (n.x - v.cx) * 0.35;
    v.cy += (n.y - v.cy) * 0.35;

    state.player.castAnim = 280;
    state.player.castType = 'channel';
    state.player.staffGlow = 250;
    state.player.sq = 1.12;
    state.player.st = 1 / state.player.sq;

    if (v.age % 3 === 0) {
      state.player.mana = Math.max(0, state.player.mana - (s.holdDrain || 0.24));
      if (state.player.mana <= 0.1) {
        v.state = 1;
        v.age = 0;
      }
    }

    v.touched = [];
    for (const e of state.entities) {
      if (!e.active) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const dx = ex - v.cx;
      const dy = ey - v.cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > s.holdR) continue;

      const k = Math.max(0, 1 - dist / s.holdR);
      const ang = (Math.sin(v.phase + dist * 0.04) * 0.5 + 0.5) * 0.4 + 0.15;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      applyMatrixToVelocity(e, cos, -sin, sin, cos, 14);
      e.vx += (-dx / dist) * (s.axisForce || 0.32) * k;
      e.vy += (-dy / dist) * (s.axisForce || 0.32) * k - 0.07;

      rememberMomentum(v.stress, e, k * 0.2);
      if (v.age % 10 === 0) hurtEntity(e, s.dmg, v.cx, v.cy);
      v.touched.push(e);

      if (v.age % 4 === 0) spawnP(ex, ey, Math.random() > 0.5 ? s.c2 : s.color, 1, 'sparkle');
    }

    for (const p of state.projectiles) {
      const dx = p.x - v.cx;
      const dy = p.y - v.cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > s.holdR + 18) continue;
      const k = Math.max(0, 1 - dist / (s.holdR + 18));
      const sv = sideVector(dx, dy);
      p.vx += sv.x * 0.3 * k - (dx / dist) * 0.08 * k;
      p.vy += sv.y * 0.3 * k - (dy / dist) * 0.08 * k;
    }

    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.holdR * 1.04, color: s.core, int: 0.95, life: 2, ml: 2 });
    return;
  }

  if (!v.released) {
    v.released = true;
    let bonus = 0;
    for (const e of v.touched || []) {
      if (!e.active) continue;
      const bag = v.stress.get(e);
      const stress = Math.hypot(bag?.vx || 0, bag?.vy || 0);
      bonus += Math.min(5, stress * 2.5);
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const dx = ex - v.cx;
      const dy = ey - v.cy;
      const dist = Math.hypot(dx, dy) || 1;
      e.vx += (dx / dist) * 9 / (e.mass || 1);
      e.vy += (dy / dist) * 6 / (e.mass || 1) - 1.1;
    }

    explode(v.cx, v.cy, s.releaseR, 10, s.releaseDmg + Math.floor(bonus), s.color, s.c2);
    state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.releaseR * 1.25, life: 12, maxLife: 12, color: s.core });
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.releaseR * 1.4, color: '#ffffff', int: 2.6, life: 6, ml: 6 });
    SoundFX.playSweep(110, 1800, 'sawtooth', 0.22, 0.12);
    state.shake(10);
  }

  if (v.age > 16) removeVfx(v);
}

function updateTensorSummon(v) {
  const s = v.spell;
  v.phase += 0.08;

  if (v.state === 0) {
    if (v.age % 2 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 24;
      spawnP(v.cx + Math.cos(a) * r, v.cy - 12 + Math.sin(a) * r, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy - 14, r: 84 + v.age * 2.1, color: s.core, int: 1.15, life: 2, ml: 2 });
    if (v.age > 18) {
      v.state = 1;
      v.age = 0;
    }
    return;
  }

  v.life -= 1;
  if (v.age % s.pulseEvery === 0) {
    v.mode = v.mode === 'compress' ? 'expand' : 'compress';
    v.pulses.push({ r: 0, maxR: s.summonR * 0.84, life: 14, maxLife: 14, mode: v.mode });

    for (const e of state.entities) {
      if (!e.active) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const dx = ex - v.cx;
      const dy = ey - v.cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > s.summonR) continue;
      const k = Math.max(0, 1 - dist / s.summonR);
      const dir = v.mode === 'compress' ? -1 : 1;
      e.vx += (dx / dist) * dir * 8 * k / (e.mass || 1);
      e.vy += (dy / dist) * dir * 5 * k / (e.mass || 1) - 0.5;
      hurtEntity(e, Math.max(1, Math.floor(s.dmg * 0.8 * k)), v.cx, v.cy);
    }

    for (const p of state.projectiles) {
      const dx = p.x - v.cx;
      const dy = p.y - v.cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > s.summonR * 0.8) continue;
      if (v.mode === 'expand') {
        p.vx = -p.vx * 1.05;
        p.vy = -p.vy * 1.05;
        v.reflected.push({ x1: v.cx, y1: v.cy - 22, x2: p.x, y2: p.y, life: 8, ml: 8 });
      } else {
        p.vx += (-dx / dist) * 0.25;
        p.vy += (-dy / dist) * 0.25;
      }
    }

    SoundFX.playTone(v.mode === 'compress' ? 340 : 520, 'triangle', 0.08, 0.08);
  }

  for (let i = v.pulses.length - 1; i >= 0; i--) {
    const p = v.pulses[i];
    p.r += p.maxR / p.maxLife;
    p.life -= 1;
    if (p.life <= 0) v.pulses.splice(i, 1);
  }

  for (let i = v.reflected.length - 1; i >= 0; i--) {
    v.reflected[i].life -= 1;
    if (v.reflected[i].life <= 0) v.reflected.splice(i, 1);
  }

  const t = nearestEnemy(v.cx, v.cy, s.summonR + 36);
  if (t && v.age % 15 === 0) {
    const tx = t.x + t.w / 2;
    const ty = t.y + t.h / 2;
    state.lightningBolts.push({
      segments: [
        { x: v.cx, y: v.cy - 20 },
        { x: (v.cx + tx) * 0.5 + (Math.random() - 0.5) * 18, y: (v.cy + ty) * 0.5 + (Math.random() - 0.5) * 18 },
        { x: tx, y: ty },
      ],
      life: 8,
      color: s.c2,
      width: 2,
    });
    hurtEntity(t, Math.floor(s.dmg * 0.5), v.cx, v.cy);
  }

  state.dynamicLights.push({ x: v.cx, y: v.cy - 15, r: 88 + Math.sin(v.phase) * 8, color: s.core, int: 1.1, life: 2, ml: 2 });

  if (v.life <= 0) {
    explode(v.cx, v.cy, 70, 9, s.dmg * 1.4, s.color, s.c2);
    removeVfx(v);
  }
}

function updateTensorCast(v) {
  const s = v.spell;
  v.phase += 0.16;

  if (!v.fired) {
    v.fired = true;
    const lines = [v.a1, v.a2];
    for (const ang of lines) {
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const x2 = v.cx + Math.cos(ang) * s.sliceLen;
        const y2 = v.cy + Math.sin(ang) * s.sliceLen;
        const x1 = v.cx - Math.cos(ang) * s.sliceLen;
        const y1 = v.cy - Math.sin(ang) * s.sliceLen;
        const hit = distToSegment(ex, ey, x1, y1, x2, y2);
        if (hit.dist > s.sliceW) continue;
        const k = Math.max(0, 1 - hit.dist / s.sliceW);
        hurtEntity(e, Math.floor(s.dmg * (0.55 + k * 0.45)), v.cx, v.cy);
        const sv = sideVector(Math.cos(ang), Math.sin(ang));
        e.vx += sv.x * 8 * k / (e.mass || 1);
        e.vy += sv.y * 6 * k / (e.mass || 1) - 0.8;
      }
    }

    state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 120, life: 10, maxLife: 10, color: s.c2 });
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 150, color: s.core, int: 2.2, life: 6, ml: 6 });
    SoundFX.playSweep(1400, 240, 'sawtooth', 0.2, 0.11);
    state.shake(8);
  }

  if (v.age > 12) removeVfx(v);
}

function updateTensorCharge(v) {
  const s = v.spell;
  const o = casterOrigin();
  v.ox = o.x;
  v.oy = o.y;
  v.phase += 0.12;

  if (v.state === 0) {
    state.player.castAnim = 280;
    state.player.castType = 'channel';
    state.player.staffGlow = 260;

    if (state.mouse?.down && v.charge < s.maxCharge) {
      v.charge += 1;
      if (v.age % 3 === 0) {
        state.player.mana = Math.max(0, state.player.mana - (s.chargeDrain || 0.22));
        if (state.player.mana <= 0.1) {
          v.state = 1;
          v.age = 0;
        }
      }
    } else {
      v.state = 1;
      v.age = 0;
    }

    const q = Math.max(0, Math.min(1, v.charge / s.maxCharge));
    if (v.age % 2 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + q * 24;
      spawnP(v.ox + Math.cos(a) * r, v.oy + Math.sin(a) * r, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
    }
    if (v.age % 20 === 0) SoundFX.playTone(220 + q * 700, 'triangle', 0.06 + q * 0.05, 0.07);

    state.dynamicLights.push({ x: v.ox, y: v.oy, r: 34 + q * 56, color: s.core, int: 0.9 + q, life: 2, ml: 2 });
    return;
  }

  if (!v.fired) {
    v.fired = true;
    const q = Math.max(0.2, v.charge / s.maxCharge);
    const tx = state.mouse?.x ?? (v.ox + state.player.facing * 160);
    const ty = state.mouse?.y ?? v.oy;
    const a = Math.atan2(ty - v.oy, tx - v.ox);
    const axisX = Math.abs(Math.cos(a));
    const axisY = Math.abs(Math.sin(a));
    const speed = 12 + q * 14;

    state.projectiles.push({
      x: v.ox,
      y: v.oy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      spell: {
        name: 'Singular Shot',
        icon: '▸',
        color: s.color,
        c2: s.c2,
        core: s.core,
        speed,
        dmg: Math.floor(s.dmg + q * 54),
        mana: 0,
        cd: 0,
        r: 4 + q * 4,
        grav: 0,
        drag: 1,
        bounce: 0,
        trail: 'tensor_eigen',
        exR: Math.floor(64 + q * 74),
        exF: Math.floor(10 + q * 8),
        axisX,
        axisY,
        isTensorveilSingularShot: true,
        _hook: PROJ_HOOKS.isTensorveilSingularShot,
      },
      life: 170,
      age: 0,
      trail: [],
      hitList: [],
      bounces: 0,
    });

    state.shockwaves.push({ x: v.ox, y: v.oy, r: 0, maxR: 46 + q * 40, life: 8, maxLife: 8, color: s.c2 });
    state.shake(4 + q * 7);
    spawnP(v.ox, v.oy, s.core, 10 + Math.floor(q * 10), 'burst');
    SoundFX.playSweep(280, 1900, 'square', 0.2 + q * 0.08, 0.16);
  }

  if (v.age > 8) removeVfx(v);
}

function updateTensorDash(v) {
  const s = v.spell;
  v.phase += 0.34;

  if (v.age % 2 === 0) {
    const t = Math.random();
    const x = v.x1 + (v.x2 - v.x1) * t;
    const y = v.y1 + (v.y2 - v.y1) * t;
    spawnP(x, y, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
  }

  for (let i = v.echoes.length - 1; i >= 0; i--) {
    const e = v.echoes[i];
    e.life -= 1;
    if (e.life <= 0) v.echoes.splice(i, 1);
  }

  state.dynamicLights.push({ x: (v.x1 + v.x2) * 0.5, y: (v.y1 + v.y2) * 0.5, r: 60, color: s.c2, int: 0.85, life: 2, ml: 2 });
  if (v.age > 15) removeVfx(v);
}

function updateTensorManifestAnchor(v) {
  const d = state.tensorveilManifestDraft;
  if (!d || d.vfx !== v) {
    removeVfx(v);
    return;
  }

  v.phase += 0.16;
  v.cx = d.x1;
  v.cy = d.y1;

  if (v.age % 5 === 0) spawnP(v.cx + (Math.random() - 0.5) * 7, v.cy + (Math.random() - 0.5) * 7, v.spell.c2, 1, 'sparkle');
  state.dynamicLights.push({ x: v.cx, y: v.cy, r: 30, color: v.spell.core, int: 0.9, life: 2, ml: 2 });
}

function updateTensorManifestGate(v) {
  const s = v.spell;
  v.phase += 0.09;
  v.life -= 1;

  const ax = v.x1;
  const ay = v.y1;
  const bx = v.x2;
  const by = v.y2;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (bx - ax) / len;
  const ny = (by - ay) / len;

  if (v.age % (s.pulseEvery || 14) === 0) {
    v.pulses.push({ r: 0, maxR: len * 0.42, life: 10, maxLife: 10 });
    SoundFX.playTone(420 + Math.random() * 120, 'triangle', 0.05, 0.05);
  }

  const bodies = [state.player, ...state.entities.filter((e) => e.active)];
  for (const b of bodies) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const hit = distToSegment(cx, cy, ax, ay, bx, by);
    if (hit.dist > (s.gateW || 34)) continue;

    const flow = (b.vx || 0) * nx + (b.vy || 0) * ny;
    const k = Math.max(0, 1 - hit.dist / (s.gateW || 34));

    if (flow >= 0) {
      b.vx += nx * (1.2 + k * 1.4) * (b === state.player ? 0.14 : 0.9 / (b.mass || 1));
      b.vy += ny * (1.0 + k) * (b === state.player ? 0.14 : 0.9 / (b.mass || 1));
      if (b === state.player && v.age % 14 === 0) b.mana = Math.min(b.maxMana, b.mana + 0.5);
    } else {
      b.vx += nx * (2.1 + k * 2.4) * (b === state.player ? 0.16 : 1.1 / (b.mass || 1));
      b.vy += ny * (1.4 + k * 1.2) * (b === state.player ? 0.16 : 1.1 / (b.mass || 1));
      if (b !== state.player && v.age % 10 === 0) hurtEntity(b, Math.max(1, Math.floor(s.dmg * k)), hit.x, hit.y);
    }
  }

  for (const p of state.projectiles) {
    const hit = distToSegment(p.x, p.y, ax, ay, bx, by);
    if (hit.dist > (s.gateW || 34) * 1.2) continue;
    const flow = (p.vx || 0) * nx + (p.vy || 0) * ny;
    if (flow < 0) {
      p.vx = -p.vx * 0.9 + nx * 2.2;
      p.vy = -p.vy * 0.9 + ny * 2.2;
    } else {
      p.vx += nx * 0.35;
      p.vy += ny * 0.35;
    }
  }

  for (let i = v.pulses.length - 1; i >= 0; i--) {
    const p = v.pulses[i];
    p.r += p.maxR / p.maxLife;
    p.life -= 1;
    if (p.life <= 0) v.pulses.splice(i, 1);
  }

  if (v.age % 2 === 0) {
    const t = Math.random();
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    spawnP(x, y, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
  }

  state.dynamicLights.push({ x: (ax + bx) * 0.5, y: (ay + by) * 0.5, r: 72, color: s.core, int: 0.82, life: 2, ml: 2 });
  if (v.life <= 0) removeVfx(v);
}

function updateTensorUltimate(v) {
  const s = v.spell;
  v.phase += 0.05;

  for (let i = v.rings.length - 1; i >= 0; i--) {
    const r = v.rings[i];
    r.r += r.maxR / r.maxLife;
    r.life -= 1;
    if (r.life <= 0) v.rings.splice(i, 1);
  }

  if (v.state === 0) {
    if (v.age % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 82;
      spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.75, s.c2, 1, 'sparkle');
    }
    if (v.age % 6 === 0) v.rings.push({ r: 0, maxR: 42 + v.age * 3, life: 8, maxLife: 8 });
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 120 + v.age * 2.6, color: s.core, int: 1.0, life: 2, ml: 2 });
    state.shake(0.85);
    if (v.age > 30) {
      v.state = 1;
      v.age = 0;
      SoundFX.playSweep(680, 220, 'square', 0.2, 0.14);
    }
    return;
  }

  if (v.state === 1) {
    const prog = Math.min(1, v.age / 76);
    const r = 110 + (s.fieldR - 110) * prog;

    for (const e of state.entities) {
      if (!e.active) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const dx = ex - v.cx;
      const dy = ey - v.cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > r) continue;

      const k = Math.max(0, 1 - dist / r);
      const m00 = 0.92 + Math.sin(v.phase + dist * 0.02) * 0.08;
      const m01 = 0.24 * (0.7 + prog);
      const m10 = -0.2 * (0.7 + prog);
      const m11 = 0.92;
      applyMatrixToVelocity(e, m00, m01, m10, m11, 16);
      e.vx += (-dx / dist) * 1.4 * k / (e.mass || 1);
      e.vy += (-dy / dist) * 1.1 * k / (e.mass || 1) - 0.08;

      rememberMomentum(v.strain, e, 0.12 * k);
      if (v.age % 12 === 0) hurtEntity(e, 4, v.cx, v.cy);
    }

    if (v.age % 8 === 0) v.rings.push({ r: 0, maxR: r * 1.05, life: 10, maxLife: 10 });
    state.dynamicLights.push({ x: v.cx, y: v.cy, r, color: s.core, int: 1.2, life: 2, ml: 2 });
    state.shake(0.9 + prog * 0.8);

    if (v.age > 76) {
      v.state = 2;
      v.age = 0;
    }
    return;
  }

  if (!v.exploded) {
    v.exploded = true;
    let bonus = 0;
    for (const [e, bag] of v.strain.entries()) {
      if (!e.active) continue;
      const sMag = Math.hypot(bag.vx, bag.vy);
      bonus += Math.min(16, sMag * 2.2);
    }
    const finalDmg = s.dmg + Math.floor(bonus);

    explode(v.cx, v.cy, s.fieldR, 22, finalDmg, s.color, s.c2);
    state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.fieldR * 1.55, life: 20, maxLife: 20, color: s.core });
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.fieldR * 1.35, color: '#ffffff', int: 4.3, life: 9, ml: 9 });

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

    SoundFX.playSweep(1900, 85, 'sawtooth', 0.34, 0.2);
    state.shake(24);
  }

  if (v.age > 36) {
    if (!v.prevInv) state.player.inv = false;
    removeVfx(v);
  }
}

function updateTensorUltimate2(v) {
  const s = v.spell;
  v.phase += 0.035;

  for (let i = v.pulses.length - 1; i >= 0; i--) {
    const p = v.pulses[i];
    p.r += p.maxR / p.maxLife;
    p.life -= 1;
    if (p.life <= 0) v.pulses.splice(i, 1);
  }

  if (v.state === 0) {
    for (const e of state.entities) {
      if (!e.active) continue;
      rememberMomentum(v.stored, e, 0.38);
      e.vx *= 0.72;
      e.vy *= 0.72;
      if (v.age % 16 === 0) hurtEntity(e, 3, v.cx, v.cy);
    }
    for (const p of state.projectiles) {
      rememberMomentum(v.storedProj, p, 0.36);
      p.vx *= 0.75;
      p.vy *= 0.75;
    }

    if (v.age % 11 === 0) {
      v.pulses.push({ r: 0, maxR: 320, life: 15, maxLife: 15 });
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 260, life: 10, maxLife: 10, color: s.color });
    }

    if (v.age % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      const r = 36 + Math.random() * 230;
      spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.65, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
    }

    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 245, color: s.core, int: 1.3, life: 2, ml: 2 });
    state.shake(0.75);

    if (v.age > s.muteDur) {
      v.state = 1;
      v.age = 0;
      SoundFX.playSweep(100, 2550, 'sawtooth', 0.34, 0.16);
    }
    return;
  }

  if (!v.exploded) {
    v.exploded = true;
    explode(v.cx, v.cy, 400, 28, s.dmg, s.color, s.c2);
    state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 540, life: 24, maxLife: 24, color: s.core });
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 560, color: '#ffffff', int: 5.7, life: 10, ml: 10 });
    state.shake(30);

    const axisX = v.axis === 'x';
    for (const [e, bag] of v.stored.entries()) {
      if (!e.active) continue;
      if (axisX) {
        e.vx += bag.vx * 2.4 + Math.sign(Math.random() - 0.5) * 3;
        e.vy += bag.vy * 0.25 - 1.3;
      } else {
        e.vx += bag.vx * 0.25 + Math.sign(Math.random() - 0.5) * 2;
        e.vy += bag.vy * 2.2 - 2.2;
      }
      hurtEntity(e, 18, v.cx, v.cy);
    }

    for (const [p, bag] of v.storedProj.entries()) {
      if (!state.projectiles.includes(p)) continue;
      if (axisX) {
        p.vx += bag.vx * 2.2;
        p.vy += bag.vy * 0.2;
      } else {
        p.vx += bag.vx * 0.2;
        p.vy += bag.vy * 2.2;
      }
    }
  }

  if (v.age > 40) {
    if (!v.prevInv) state.player.inv = false;
    removeVfx(v);
  }
}

export const VFX_UPDATE = {
  tensor_hold(v) {
    updateTensorHold(v);
  },

  tensor_summon(v) {
    updateTensorSummon(v);
  },

  tensor_cast_slice(v) {
    updateTensorCast(v);
  },

  tensor_charge(v) {
    updateTensorCharge(v);
  },

  tensor_dash(v) {
    updateTensorDash(v);
  },

  tensor_manifest_anchor(v) {
    updateTensorManifestAnchor(v);
  },

  tensor_manifest_gate(v) {
    updateTensorManifestGate(v);
  },

  tensor_ultimate_chorus(v) {
    updateTensorUltimate(v);
  },

  tensor_ultimate_rank(v) {
    updateTensorUltimate2(v);
  },
};

export const VFX_DRAW = {
  tensor_hold(v, X) {
    const s = v.spell;
    const prep = v.state === 1 ? Math.max(0.2, 1 - v.age / 16) : 1;
    const rx = s.holdR * (1.03 + Math.sin(v.phase || 0) * 0.02) * prep;
    const ry = s.holdR * 0.72 * prep;

    X.save();
    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.16;
    X.fillStyle = s.color;
    X.beginPath();
    X.ellipse(0, 0, rx, ry, (v.phase || 0) * 0.24, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.72;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.setLineDash([7, 5]);
    X.lineDashOffset = -(v.phase || 0) * 10;
    X.beginPath();
    X.ellipse(0, 0, rx, ry, (v.phase || 0) * 0.24, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);

    for (let i = 0; i < 8; i++) {
      const a = (v.phase || 0) * 1.3 + (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * rx * 0.86;
      const y = Math.sin(a) * ry * 0.86;
      X.globalAlpha = 0.75;
      X.strokeStyle = i % 2 ? s.c2 : s.core;
      X.lineWidth = 1.6;
      X.beginPath();
      X.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7);
      X.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      X.stroke();
    }

    X.restore();

    X.save();
    X.globalAlpha = 0.3;
    X.strokeStyle = s.core;
    X.lineWidth = 1.2;
    X.beginPath();
    X.moveTo(v.ox, v.oy);
    X.lineTo(v.cx, v.cy);
    X.stroke();
    X.restore();
  },

  tensor_summon(v, X) {
    const s = v.spell;
    X.save();
    X.translate(v.cx, v.cy);
    const bob = Math.sin((v.phase || 0) * 0.7) * 3;

    X.globalAlpha = 0.9;
    X.fillStyle = '#1f2b2d';
    X.beginPath();
    X.moveTo(-14, 14 + bob);
    X.lineTo(-8, -44 + bob);
    X.lineTo(0, -58 + bob);
    X.lineTo(8, -44 + bob);
    X.lineTo(14, 14 + bob);
    X.closePath();
    X.fill();

    X.globalAlpha = 0.72;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.stroke();

    for (const p of v.pulses || []) {
      const a = p.life / p.maxLife;
      X.globalAlpha = 0.22 * a;
      X.strokeStyle = p.mode === 'compress' ? s.c2 : s.color;
      X.lineWidth = 2;
      X.beginPath();
      X.ellipse(0, 10, p.r, p.r * 0.45, 0, 0, Math.PI * 2);
      X.stroke();
    }

    X.restore();

    X.save();
    for (const line of v.reflected || []) {
      const a = line.life / line.ml;
      X.globalAlpha = 0.42 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 1.1;
      X.beginPath();
      X.moveTo(line.x1, line.y1);
      X.lineTo(line.x2, line.y2);
      X.stroke();
    }
    X.restore();
  },

  tensor_cast_slice(v, X) {
    const s = v.spell;
    const a = Math.max(0, 1 - v.age / 12);
    X.save();
    X.translate(v.cx, v.cy);

    const lines = [v.a1, v.a2];
    X.globalAlpha = 0.8 * a;
    X.strokeStyle = s.c2;
    X.lineWidth = 3;
    for (const ang of lines) {
      X.beginPath();
      X.moveTo(-Math.cos(ang) * s.sliceLen, -Math.sin(ang) * s.sliceLen);
      X.lineTo(Math.cos(ang) * s.sliceLen, Math.sin(ang) * s.sliceLen);
      X.stroke();
    }

    X.globalAlpha = 0.22 * a;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, 26 + v.age * 4, 0, Math.PI * 2);
    X.fill();

    X.restore();
  },

  tensor_charge(v, X) {
    const s = v.spell;
    const q = Math.max(0, Math.min(1, (v.charge || 0) / (s.maxCharge || 100)));
    X.save();
    X.translate(v.ox, v.oy);

    X.globalAlpha = 0.16 + q * 0.2;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, 14 + q * 19, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.75;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.arc(0, 0, 19 + q * 24, 0, Math.PI * 2);
    X.stroke();

    X.restore();
  },

  tensor_dash(v, X) {
    const s = v.spell;
    const a = Math.max(0, 1 - v.age / 15);
    X.save();

    X.globalAlpha = 0.22 * a;
    X.strokeStyle = s.color;
    X.lineWidth = 12;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    X.globalAlpha = 0.82 * a;
    X.strokeStyle = s.c2;
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    for (const e of v.echoes || []) {
      const ea = e.life / e.ml;
      X.globalAlpha = 0.3 * ea;
      X.fillStyle = s.core;
      X.beginPath();
      X.arc(e.x, e.y, 6, 0, Math.PI * 2);
      X.fill();
    }

    X.restore();
  },

  tensor_manifest_anchor(v, X) {
    const s = v.spell;
    X.save();
    X.globalAlpha = 0.7;
    X.strokeStyle = s.c2;
    X.lineWidth = 1.5;
    X.beginPath();
    X.arc(v.cx, v.cy, 10 + Math.sin((v.phase || 0) * 1.2) * 2, 0, Math.PI * 2);
    X.stroke();
    X.restore();
  },

  tensor_manifest_gate(v, X) {
    const s = v.spell;
    const dx = v.x2 - v.x1;
    const dy = v.y2 - v.y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const w = s.gateW || 34;

    X.save();

    X.globalAlpha = 0.2;
    X.fillStyle = s.color;
    X.beginPath();
    X.moveTo(v.x1 + px * w, v.y1 + py * w);
    X.lineTo(v.x1 - px * w, v.y1 - py * w);
    X.lineTo(v.x2 - px * w, v.y2 - py * w);
    X.lineTo(v.x2 + px * w, v.y2 + py * w);
    X.closePath();
    X.fill();

    X.globalAlpha = 0.82;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    for (const p of v.pulses || []) {
      const a = p.life / p.maxLife;
      X.globalAlpha = 0.24 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 1.6;
      X.beginPath();
      X.ellipse((v.x1 + v.x2) * 0.5, (v.y1 + v.y2) * 0.5, p.r, p.r * 0.48, (v.phase || 0) * 0.18, 0, Math.PI * 2);
      X.stroke();
    }

    X.restore();
  },

  tensor_ultimate_chorus(v, X) {
    const s = v.spell;
    const p = v.phase || 0;
    const r = v.state === 0 ? 40 + v.age * 3 : (v.state === 1 ? Math.min(s.fieldR, 110 + v.age * 2.5) : s.fieldR);

    X.save();
    X.globalAlpha = v.state < 2 ? 0.08 : 0.16;
    X.fillStyle = '#c9ffd8';
    X.fillRect(0, 0, state.W, state.H);

    X.translate(v.cx, v.cy);
    X.globalAlpha = 0.14;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.74;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.ellipse(0, 0, r, r * 0.72, p * 0.22, 0, Math.PI * 2);
    X.stroke();

    for (const ring of v.rings || []) {
      const a = ring.life / ring.maxLife;
      X.globalAlpha = 0.24 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 1.6;
      X.beginPath();
      X.ellipse(0, 0, ring.r, ring.r * 0.72, p * 0.15, 0, Math.PI * 2);
      X.stroke();
    }

    for (const an of v.anchors || []) {
      const ang = an.a + p * 0.2;
      const x = Math.cos(ang) * an.r;
      const y = Math.sin(ang) * an.r * 0.72;
      X.globalAlpha = 0.7;
      X.fillStyle = s.core;
      X.beginPath();
      X.arc(x, y, 3, 0, Math.PI * 2);
      X.fill();
    }

    X.restore();
  },

  tensor_ultimate_rank(v, X) {
    const s = v.spell;
    X.save();
    X.globalAlpha = v.state === 0 ? 0.12 : 0.22;
    X.fillStyle = '#d6ffe2';
    X.fillRect(0, 0, state.W, state.H);

    X.translate(v.cx, v.cy);
    X.globalAlpha = 0.22;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, 160 + Math.sin((v.phase || 0) * 0.8) * 18, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.84;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    if (v.axis === 'x') {
      X.ellipse(0, 0, 240, 110, (v.phase || 0) * 0.2, 0, Math.PI * 2);
    } else {
      X.ellipse(0, 0, 110, 240, (v.phase || 0) * 0.2, 0, Math.PI * 2);
    }
    X.stroke();

    for (const p of v.pulses || []) {
      const a = p.life / p.maxLife;
      X.globalAlpha = 0.24 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 2;
      X.beginPath();
      X.ellipse(0, 0, p.r, p.r * 0.62, (v.phase || 0) * 0.18, 0, Math.PI * 2);
      X.stroke();
    }

    X.restore();
  },
};
