// lightning-new.js — five flexible lightning spells for the revamp pass.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import {
  bodyCenter,
  damageEnemiesAlongSegment,
  damageEnemiesInRadius,
  distanceToSegment,
  drawBlade,
  drawRing,
  nearestEnemyOrPoint,
  playerCenter,
  pushLightningBolt,
  removeVfx,
} from './revamp-helpers.js?v=1';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';

const L = {
  gold: '#ffe95a',
  cyan: '#9eeeff',
  blue: '#6aa8ff',
  violet: '#b77cff',
  core: '#ffffff',
};

export const SPELL_DEFS = [
  {
    name: 'Forked Rail', icon: 'ϟ', key: '3', category: 'Ray',
    color: L.gold, c2: L.cyan, core: L.core,
    speed: 0, dmg: 34, mana: 24, cd: 620, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'electric', isForkedRail: true, railWidth: 28,
    desc: 'A straight rail shot forks twice near the cursor, rewarding clean aim while still clipping clustered enemies.',
  },
  {
    name: 'Static Loom', icon: '🕸️', key: 'P', category: 'Trap',
    color: L.cyan, c2: L.gold, core: L.core,
    speed: 0, dmg: 9, mana: 28, cd: 1120, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'electric', isStaticLoom: true, loomR: 118, loomDur: 190,
    desc: 'Four charged pins weave a crackling mesh; enemies crossing threads are slowed and repeatedly nicked by arcs.',
  },
  {
    name: 'Ion Bloom', icon: '✺', key: 'Q', category: 'Zone',
    color: L.violet, c2: L.cyan, core: L.core,
    speed: 0, dmg: 13, mana: 30, cd: 1360, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'electric', isIonBloom: true, bloomR: 136, bloomDur: 115,
    desc: 'A seed of ionized air opens in rings, each petal choosing a different nearby target for a short jumping zap.',
  },
  {
    name: 'Bolt Tether', icon: '⛓️', key: 'F', category: 'Bind',
    color: L.gold, c2: L.blue, core: L.core,
    speed: 0, dmg: 8, mana: 26, cd: 1020, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'electric', isBoltTether: true, tetherDur: 135, tetherR: 260,
    desc: 'Hooks the nearest enemy with a living bolt; distance tightens the leash, dragging the target and sparking side arcs.',
  },
  {
    name: 'Stormglass Prism', icon: '🔷', key: 'C', category: 'Structure',
    color: L.blue, c2: L.violet, core: L.core,
    speed: 0, dmg: 12, mana: 34, cd: 1520, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'electric', isStormglassPrism: true, prismDur: 240, prismR: 170,
    desc: 'Plants a floating stormglass prism that rotates facets, refracts allied lightning, and fires autonomous needle arcs.',
  },
];

export const FIRE_HANDLERS = {
  isForkedRail(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'lightning_forked_rail', state: 0, age: 0, x1: pc.x, y1: pc.y, x2: tx, y2: ty, spell: s });
    SoundFX.playSweep(1400, 220, 'sawtooth', 0.42, 0.16);
    return true;
  },

  isStaticLoom(s, ox, oy, tx, ty) {
    const nodes = Array.from({ length: 4 }, (_, i) => ({
      x: tx + Math.cos((Math.PI * 2 * i) / 4 + Math.PI / 4) * s.loomR,
      y: ty + Math.sin((Math.PI * 2 * i) / 4 + Math.PI / 4) * s.loomR * 0.72,
    }));
    state.vfxSequences.push({ type: 'lightning_static_loom', state: 0, age: 0, cx: tx, cy: ty, nodes, spell: s, lastHit: new Map() });
    SoundFX.playTone(520, 'square', 0.18, 0.24);
    spawnP(tx, ty, s.c2, 12, 'sparkle');
    return true;
  },

  isIonBloom(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'lightning_ion_bloom', state: 0, age: 0, cx: tx, cy: ty, spell: s, hit: new Map() });
    SoundFX.playSweep(260, 1600, 'sine', 0.28, 0.3);
    return true;
  },

  isBoltTether(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const target = nearestEnemyOrPoint(tx, ty, s.tetherR);
    state.vfxSequences.push({
      type: 'lightning_bolt_tether', state: 0, age: 0,
      cx: pc.x, cy: pc.y, ax: tx, ay: ty, target: target.entity, spell: s,
    });
    SoundFX.playSweep(760, 1260, 'sawtooth', 0.34, 0.2);
    return true;
  },

  isStormglassPrism(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'lightning_stormglass_prism', state: 0, age: 0, cx: tx, cy: ty, spell: s, phase: Math.random() * 6.28 });
    SoundFX.playTone(880, 'triangle', 0.22, 0.32);
    state.dynamicLights.push({ x: tx, y: ty, r: 120, color: s.c2, int: 2.2, life: 12, ml: 12 });
    return true;
  },
};

export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  lightning_forked_rail(v) {
    const s = v.spell;
    if (v.age === 1) {
      const ang = Math.atan2(v.y2 - v.y1, v.x2 - v.x1);
      const forkLen = 92;
      const forks = [
        [v.x1, v.y1, v.x2, v.y2],
        [v.x2, v.y2, v.x2 + Math.cos(ang - 0.42) * forkLen, v.y2 + Math.sin(ang - 0.42) * forkLen],
        [v.x2, v.y2, v.x2 + Math.cos(ang + 0.42) * forkLen, v.y2 + Math.sin(ang + 0.42) * forkLen],
      ];
      for (const [x1, y1, x2, y2] of forks) {
        pushLightningBolt(x1, y1, x2, y2, s.core, 3, 8, 20);
        damageEnemiesAlongSegment(x1, y1, x2, y2, s.railWidth, s.dmg, 2, s.color);
      }
      state.shake(5);
    }
    if (v.age > 18) removeVfx(v);
  },

  lightning_static_loom(v) {
    const s = v.spell;
    if (v.age % 6 === 0) {
      for (let i = 0; i < v.nodes.length; i++) {
        const a = v.nodes[i];
        const b = v.nodes[(i + 1) % v.nodes.length];
        pushLightningBolt(a.x, a.y, b.x, b.y, s.c2, 1.4, 5, 10);
      }
    }
    if (v.age % 10 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const c = bodyCenter(e);
        let crossed = false;
        for (let i = 0; i < v.nodes.length; i++) {
          const a = v.nodes[i];
          const b = v.nodes[(i + 1) % v.nodes.length];
          if (distanceToSegment(c.x, c.y, a.x, a.y, b.x, b.y).dist < 18) crossed = true;
        }
        if (!crossed) continue;
        const last = v.lastHit.get(e) || -999;
        if (v.age - last < 20) continue;
        v.lastHit.set(e, v.age);
        hurtEntity(e, s.dmg, v.cx, v.cy);
        e.vx *= 0.72;
        e.vy *= 0.78;
        spawnP(c.x, c.y, s.color, 4, 'sparkle');
      }
    }
    if (v.age > s.loomDur) removeVfx(v);
  },

  lightning_ion_bloom(v) {
    const s = v.spell;
    const r = Math.min(s.bloomR, 16 + v.age * 1.6);
    if (v.age % 14 === 0) {
      const targets = [];
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const c = bodyCenter(e);
        const d = Math.hypot(c.x - v.cx, c.y - v.cy);
        if (d < r + 36) targets.push({ e, c, d });
      }
      targets.sort((a, b) => a.d - b.d);
      for (const target of targets.slice(0, 4)) {
        const last = v.hit.get(target.e) || -999;
        if (v.age - last < 24) continue;
        v.hit.set(target.e, v.age);
        hurtEntity(target.e, s.dmg, v.cx, v.cy);
        pushLightningBolt(v.cx, v.cy, target.c.x, target.c.y, s.c2, 1.7, 6, 22);
      }
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r, color: s.c2, int: 0.85, life: 2, ml: 2 });
    if (v.age > s.bloomDur) removeVfx(v);
  },

  lightning_bolt_tether(v) {
    const s = v.spell;
    const pc = playerCenter(v.cx, v.cy);
    v.cx = pc.x;
    v.cy = pc.y;
    if (!isEnemyEntity(v.target)) {
      const target = nearestEnemyOrPoint(v.ax, v.ay, s.tetherR);
      v.target = target.entity;
      if (!v.target && v.age > 20) removeVfx(v);
      return;
    }
    const c = bodyCenter(v.target);
    const dx = v.cx - c.x;
    const dy = v.cy - c.y;
    const d = Math.hypot(dx, dy) || 1;
    v.target.vx += (dx / d) * 0.28;
    v.target.vy += (dy / d) * 0.18 - 0.08;
    if (v.age % 12 === 0) {
      hurtEntity(v.target, s.dmg + Math.round(d / 80), v.cx, v.cy);
      pushLightningBolt(v.cx, v.cy, c.x, c.y, s.core, 2.2, 7, 24);
      damageEnemiesInRadius(c.x, c.y, 52, 4, 1, s.color, new Set([v.target]));
    }
    if (d > s.tetherR || v.age > s.tetherDur) removeVfx(v);
  },

  lightning_stormglass_prism(v) {
    const s = v.spell;
    v.phase += 0.055;
    if (v.age % 16 === 0) {
      const targets = [];
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const c = bodyCenter(e);
        const d = Math.hypot(c.x - v.cx, c.y - v.cy);
        if (d < s.prismR) targets.push({ e, c, d });
      }
      targets.sort((a, b) => a.d - b.d);
      for (const target of targets.slice(0, 2)) {
        hurtEntity(target.e, s.dmg, v.cx, v.cy);
        pushLightningBolt(v.cx, v.cy, target.c.x, target.c.y, s.c2, 1.8, 6, 18);
      }
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 96, color: s.c2, int: 1.1, life: 2, ml: 2 });
    if (v.age > s.prismDur) removeVfx(v);
  },
};

export const VFX_DRAW = {
  lightning_forked_rail(v, X) {
    const s = v.spell;
    const a = Math.max(0, 1 - v.age / 18);
    drawBlade(X, v.x1, v.y1, v.x2, v.y2, 10, s.c2, s.core, a);
  },

  lightning_static_loom(v, X) {
    const s = v.spell;
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < v.nodes.length; i++) {
      const a = v.nodes[i];
      const b = v.nodes[(i + 1) % v.nodes.length];
      drawBlade(X, a.x, a.y, b.x, b.y, 3, s.color, s.core, 0.42);
      drawRing(X, a.x, a.y, 8 + Math.sin(v.age * 0.16 + i) * 2, s.c2, 0.8, 2);
    }
    X.restore();
  },

  lightning_ion_bloom(v, X) {
    const s = v.spell;
    const r = Math.min(s.bloomR, 16 + v.age * 1.6);
    for (let i = 0; i < 4; i++) drawRing(X, v.cx, v.cy, r * (0.35 + i * 0.22), i % 2 ? s.color : s.c2, 0.32, 2);
  },

  lightning_bolt_tether(v, X) {
    const s = v.spell;
    if (!isEnemyEntity(v.target)) return;
    const c = bodyCenter(v.target);
    drawBlade(X, v.cx, v.cy, c.x, c.y, 5 + Math.sin(v.age * 0.4) * 1.5, s.color, s.core, 0.72);
  },

  lightning_stormglass_prism(v, X) {
    const s = v.spell;
    X.save();
    X.translate(v.cx, v.cy);
    X.rotate(v.phase);
    X.globalCompositeOperation = 'lighter';
    X.strokeStyle = s.c2;
    X.fillStyle = 'rgba(255,255,255,0.16)';
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(0, -24);
    X.lineTo(24, 0);
    X.lineTo(0, 24);
    X.lineTo(-24, 0);
    X.closePath();
    X.fill();
    X.stroke();
    X.strokeStyle = s.core;
    X.lineWidth = 1;
    X.beginPath();
    X.moveTo(0, -24);
    X.lineTo(0, 24);
    X.moveTo(-24, 0);
    X.lineTo(24, 0);
    X.stroke();
    X.restore();
  },
};
