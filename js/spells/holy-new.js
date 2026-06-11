// holy-new.js — five flexible Holy spells without Manifest constructs.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import {
  bodyCenter,
  damageEnemiesAlongSegment,
  damageEnemiesInRadius,
  drawBlade,
  drawRing,
  healPlayer,
  nearestEnemyOrPoint,
  playerCenter,
  removeVfx,
} from './revamp-helpers.js?v=1';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';

const HLY = {
  gold: '#ffe075',
  pearl: '#fff7d8',
  dawn: '#ffcf66',
  blue: '#d8ecff',
  rose: '#ffd1e3',
  core: '#ffffff',
};

export const SPELL_DEFS = [
  {
    name: 'Reliquary Lantern', icon: '🏮', key: 'F', category: 'Summon',
    color: HLY.gold, c2: HLY.pearl, core: HLY.core,
    speed: 0, dmg: 8, mana: 28, cd: 1320, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'holy', isReliquaryLantern: true, lanternDur: 260, lanternR: 130,
    desc: 'A small reliquary lantern floats near the caster, blessing allies while sending patient sparks at nearby foes.',
  },
  {
    name: 'Mercy Thread', icon: '🧵', key: 'K', category: 'Tether',
    color: HLY.rose, c2: HLY.gold, core: HLY.core,
    speed: 0, dmg: 9, mana: 24, cd: 980, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'holy', isMercyThread: true, threadDur: 120, threadR: 280,
    desc: 'A golden thread binds one enemy to the caster, converting each pulse of judgment into a small restorative grace.',
  },
  {
    name: 'Crown of Dawn', icon: '👑', key: 'L', category: 'Zone',
    color: HLY.dawn, c2: '#fff2a8', core: HLY.core,
    speed: 0, dmg: 16, mana: 32, cd: 1420, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'holy', isCrownOfDawn: true, crownDur: 105, crownR: 118,
    desc: 'A dawn crown opens over the chosen point and rains short sun-lances in a widening circle that rewards setup.',
  },
  {
    name: 'Aegis Procession', icon: '🛡️', key: 'R', category: 'Ward',
    color: HLY.blue, c2: HLY.gold, core: HLY.core,
    speed: 0, dmg: 14, mana: 34, cd: 1680, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'holy', isAegisProcession: true, processionDur: 155, shieldCount: 5,
    desc: 'Five luminous shields march forward as a procession, screening hostile shots and pushing enemies into a bright lane.',
  },
  {
    name: 'Star Psalm', icon: '✶', key: '/', category: 'Swarm',
    color: HLY.pearl, c2: HLY.gold, core: HLY.core,
    speed: 0, dmg: 7, mana: 26, cd: 1040, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'holy', isStarPsalm: true, psalmNotes: 6, psalmDur: 135,
    desc: 'Sung star-notes orbit outward, each choosing a target or returning to the caster as a gentle healing mote.',
  },
];

export const FIRE_HANDLERS = {
  isReliquaryLantern(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'holy_reliquary_lantern', state: 0, age: 0, cx: pc.x, cy: pc.y - 48, spell: s, phase: 0 });
    SoundFX.playTone(660, 'sine', 0.24, 0.28);
    spawnP(pc.x, pc.y, s.c2, 12, 'sparkle');
    return true;
  },

  isMercyThread(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const target = nearestEnemyOrPoint(tx, ty, s.threadR);
    state.vfxSequences.push({ type: 'holy_mercy_thread', state: 0, age: 0, cx: pc.x, cy: pc.y, target: target.entity, ax: tx, ay: ty, spell: s });
    SoundFX.playSweep(480, 980, 'sine', 0.2, 0.22);
    return true;
  },

  isCrownOfDawn(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'holy_crown_of_dawn', state: 0, age: 0, cx: tx, cy: ty, spell: s, hit: new Map() });
    SoundFX.playTone(980, 'sine', 0.28, 0.32);
    state.dynamicLights.push({ x: tx, y: ty, r: 160, color: s.color, int: 2.4, life: 14, ml: 14 });
    return true;
  },

  isAegisProcession(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const angle = Math.atan2(ty - pc.y, tx - pc.x);
    state.vfxSequences.push({ type: 'holy_aegis_procession', state: 0, age: 0, ox: pc.x, oy: pc.y, angle, spell: s, hit: new Set() });
    SoundFX.playSweep(240, 620, 'triangle', 0.26, 0.26);
    return true;
  },

  isStarPsalm(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const notes = Array.from({ length: s.psalmNotes }, (_, i) => ({
      x: pc.x,
      y: pc.y - 12,
      vx: Math.cos((Math.PI * 2 * i) / s.psalmNotes) * 2.2,
      vy: Math.sin((Math.PI * 2 * i) / s.psalmNotes) * 2.2 - 0.8,
      phase: i,
      spent: false,
    }));
    state.vfxSequences.push({ type: 'holy_star_psalm', state: 0, age: 0, notes, spell: s });
    SoundFX.playTone(880, 'sine', 0.16, 0.2);
    SoundFX.playTone(1320, 'sine', 0.12, 0.22);
    return true;
  },
};

export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  holy_reliquary_lantern(v) {
    const s = v.spell;
    const pc = playerCenter(v.cx, v.cy);
    v.phase += 0.07;
    v.cx += (pc.x + Math.cos(v.phase) * 36 - v.cx) * 0.04;
    v.cy += (pc.y - 58 + Math.sin(v.phase * 1.3) * 12 - v.cy) * 0.04;
    if (v.age % 24 === 0) healPlayer(1, s.core);
    if (v.age % 18 === 0) {
      const target = nearestEnemyOrPoint(v.cx, v.cy, s.lanternR);
      if (target.entity) {
        hurtEntity(target.entity, s.dmg, v.cx, v.cy);
        state.lightningBolts.push({ segments: [{ x: v.cx, y: v.cy }, { x: target.x, y: target.y }], life: 10, color: s.c2, width: 2 });
      }
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 72, color: s.c2, int: 0.9, life: 2, ml: 2 });
    if (v.age > s.lanternDur) removeVfx(v);
  },

  holy_mercy_thread(v) {
    const s = v.spell;
    const pc = playerCenter(v.cx, v.cy);
    v.cx = pc.x;
    v.cy = pc.y;
    if (!isEnemyEntity(v.target)) {
      const target = nearestEnemyOrPoint(v.ax, v.ay, s.threadR);
      v.target = target.entity;
      if (!v.target && v.age > 18) removeVfx(v);
      return;
    }
    const c = bodyCenter(v.target);
    if (v.age % 14 === 0) {
      hurtEntity(v.target, s.dmg, v.cx, v.cy);
      healPlayer(1, s.core);
      spawnP(c.x, c.y, s.c2, 4, 'sparkle');
    }
    if (Math.hypot(c.x - v.cx, c.y - v.cy) > s.threadR || v.age > s.threadDur) removeVfx(v);
  },

  holy_crown_of_dawn(v) {
    const s = v.spell;
    const radius = Math.min(s.crownR, 24 + v.age * 1.5);
    if (v.age % 10 === 0) {
      const angle = v.age * 0.31;
      const x = v.cx + Math.cos(angle) * radius;
      const y = v.cy + Math.sin(angle) * radius * 0.6;
      damageEnemiesInRadius(x, y, 42, s.dmg, 2, s.color);
      state.lightningBolts.push({ segments: [{ x, y: y - 130 }, { x, y }], life: 12, color: s.core, width: 2.4 });
      spawnP(x, y, s.c2, 4, 'sparkle');
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: radius + 40, color: s.color, int: 0.75, life: 2, ml: 2 });
    if (v.age > s.crownDur) removeVfx(v);
  },

  holy_aegis_procession(v) {
    const s = v.spell;
    const nx = Math.cos(v.angle);
    const ny = Math.sin(v.angle);
    const px = -ny;
    const py = nx;
    const front = Math.min(320, v.age * 3.5);
    const cx = v.ox + nx * front;
    const cy = v.oy + ny * front;
    const half = (s.shieldCount - 1) * 16;
    damageEnemiesAlongSegment(cx + px * half, cy + py * half, cx - px * half, cy - py * half, 34, s.dmg, 6, s.c2, v.hit);
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = state.enemyProjectiles[i];
      const x = p.x ?? p.cx ?? 0;
      const y = p.y ?? p.cy ?? 0;
      if (Math.hypot(x - cx, y - cy) < 54) {
        state.enemyProjectiles.splice(i, 1);
        spawnP(x, y, s.core, 6, 'sparkle');
      }
    }
    if (v.age > s.processionDur) removeVfx(v);
  },

  holy_star_psalm(v) {
    const s = v.spell;
    const pc = playerCenter();
    for (const note of v.notes) {
      note.phase += 0.12;
      if (note.spent) {
        note.x += (pc.x - note.x) * 0.08;
        note.y += (pc.y - note.y) * 0.08;
        if (Math.hypot(note.x - pc.x, note.y - pc.y) < 10) healPlayer(1, s.core);
        continue;
      }
      const target = nearestEnemyOrPoint(note.x, note.y, 190);
      if (target.entity) {
        const dx = target.x - note.x;
        const dy = target.y - note.y;
        const d = Math.hypot(dx, dy) || 1;
        note.vx = note.vx * 0.86 + (dx / d) * 1.5;
        note.vy = note.vy * 0.86 + (dy / d) * 1.5;
        if (d < 14) {
          hurtEntity(target.entity, s.dmg, note.x, note.y);
          note.spent = true;
        }
      }
      note.x += note.vx;
      note.y += note.vy;
    }
    if (v.age > s.psalmDur) removeVfx(v);
  },
};

export const VFX_DRAW = {
  holy_reliquary_lantern(v, X) {
    const s = v.spell;
    drawRing(X, v.cx, v.cy, 18 + Math.sin(v.age * 0.16) * 2, s.c2, 0.8, 2);
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = s.color;
    X.fillRect(v.cx - 8, v.cy - 12, 16, 24);
    X.fillStyle = s.core;
    X.fillRect(v.cx - 3, v.cy - 6, 6, 12);
    X.restore();
  },

  holy_mercy_thread(v, X) {
    if (!isEnemyEntity(v.target)) return;
    const s = v.spell;
    const c = bodyCenter(v.target);
    drawBlade(X, v.cx, v.cy, c.x, c.y, 4, s.color, s.core, 0.64);
  },

  holy_crown_of_dawn(v, X) {
    const s = v.spell;
    const radius = Math.min(s.crownR, 24 + v.age * 1.5);
    drawRing(X, v.cx, v.cy, radius, s.color, 0.42, 3);
    drawRing(X, v.cx, v.cy - radius * 0.38, radius * 0.42, s.core, 0.5, 2);
  },

  holy_aegis_procession(v, X) {
    const s = v.spell;
    const nx = Math.cos(v.angle);
    const ny = Math.sin(v.angle);
    const px = -ny;
    const py = nx;
    const front = Math.min(320, v.age * 3.5);
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < s.shieldCount; i++) {
      const off = (i - (s.shieldCount - 1) / 2) * 32;
      const x = v.ox + nx * front + px * off;
      const y = v.oy + ny * front + py * off;
      X.fillStyle = i % 2 ? s.color : s.c2;
      X.beginPath();
      X.moveTo(x, y - 18);
      X.lineTo(x + 12, y - 5);
      X.lineTo(x + 8, y + 16);
      X.lineTo(x, y + 24);
      X.lineTo(x - 8, y + 16);
      X.lineTo(x - 12, y - 5);
      X.closePath();
      X.fill();
    }
    X.restore();
  },

  holy_star_psalm(v, X) {
    const s = v.spell;
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = s.core;
    for (const note of v.notes) {
      X.globalAlpha = note.spent ? 0.36 : 0.88;
      X.beginPath();
      X.arc(note.x, note.y, 4, 0, Math.PI * 2);
      X.fill();
      X.fillRect(note.x + 2, note.y - 11, 2, 11);
    }
    X.restore();
  },
};
