// echolith-new.js — five Good/Evil ritual spells for the Echolith rebuild.
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
import { drawEcholithHalo, drawEcholithHorns, drawEcholithScale, drawEcholithSigil } from './echolith-art.js?v=1';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';

const EC = {
  good: '#fff4b8',
  mercy: '#ffe27a',
  evil: '#8f0713',
  abyss: '#1b0610',
  blood: '#ff3328',
  core: '#ffffff',
};

export const SPELL_DEFS = [
  {
    name: 'Mercy Guillotine', icon: '⚖️', key: '1', category: 'Cast',
    color: EC.good, c2: EC.mercy, core: EC.core,
    speed: 0, dmg: 42, mana: 24, cd: 780, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'echolith_ray', isMercyGuillotine: true, echolithSide: 'good', bladeLen: 210,
    desc: 'A saint halo becomes a falling mercy blade, judging one lane before blooming into a brief absolution flare.',
  },
  {
    name: 'Sin-Eater Lantern', icon: '🕯️', key: '4', category: 'Summon',
    color: '#f6d77c', c2: EC.evil, core: EC.core,
    speed: 0, dmg: 7, mana: 28, cd: 1480, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'echolith_charge_trail', isSinEaterLantern: true, echolithSide: 'threshold', lanternDur: 230, lanternR: 136,
    desc: 'A confessional lantern follows the guilty, eating sin from nearby souls and returning a small mercy to the caster.',
  },
  {
    name: 'Halo Debt', icon: '◉', key: '7', category: 'Mark',
    color: EC.mercy, c2: EC.good, core: EC.core,
    speed: 0, dmg: 56, mana: 30, cd: 1320, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'echolith_ray', isHaloDebt: true, echolithSide: 'good', debtR: 88,
    desc: 'Marks a soul with borrowed halo light; after three tolls the unpaid mercy collapses into a focused verdict.',
  },
  {
    name: 'Abyss Choirbook', icon: '📖', key: '9', category: 'Swarm',
    color: EC.abyss, c2: EC.blood, core: '#ffd8d0',
    speed: 0, dmg: 8, mana: 34, cd: 1620, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'echolith_charge_trail', isAbyssChoirbook: true, echolithSide: 'evil', pageCount: 8,
    desc: 'An infernal choirbook tears out singing pages that hunt sinners, each page snapping shut with a demon whisper.',
  },
  {
    name: 'Penance Chain', icon: '⛓️', key: '0', category: 'Bind',
    color: '#d7c08a', c2: EC.blood, core: EC.core,
    speed: 0, dmg: 12, mana: 26, cd: 1160, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'echolith_charge_trail', isPenanceChain: true, echolithSide: 'threshold', chainDur: 125, chainR: 275,
    desc: 'A split chain of mercy and damnation hooks one soul, dragging it toward confession while tolling repeated pain.',
  },
];

export const FIRE_HANDLERS = {
  isMercyGuillotine(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'echolith_mercy_guillotine', state: 0, age: 0, x1: pc.x, y1: pc.y, x2: tx, y2: ty, spell: s });
    SoundFX.playSweep(520, 1600, 'sine', 0.28, 0.26);
    return true;
  },

  isSinEaterLantern(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'echolith_sin_eater_lantern', state: 0, age: 0, cx: tx, cy: ty - 38, spell: s, phase: 0 });
    SoundFX.playTone(330, 'triangle', 0.24, 0.32);
    spawnP(tx, ty, s.color, 10, 'sparkle');
    return true;
  },

  isHaloDebt(s, ox, oy, tx, ty) {
    const target = nearestEnemyOrPoint(tx, ty, 340);
    state.vfxSequences.push({ type: 'echolith_halo_debt', state: 0, age: 0, cx: target.x, cy: target.y, target: target.entity, tolls: 0, spell: s });
    SoundFX.playTone(720, 'sine', 0.22, 0.3);
    return true;
  },

  isAbyssChoirbook(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const pages = Array.from({ length: s.pageCount }, (_, i) => ({
      x: pc.x,
      y: pc.y - 28,
      vx: Math.cos(i * 0.8) * 2.4,
      vy: Math.sin(i * 1.1) * 1.6 - 1.4,
      phase: i * 0.7,
      spent: false,
    }));
    state.vfxSequences.push({ type: 'echolith_abyss_choirbook', state: 0, age: 0, pages, spell: s });
    SoundFX.playNoise(0.25, 0.3, 260, 'lowpass');
    return true;
  },

  isPenanceChain(s, ox, oy, tx, ty) {
    const target = nearestEnemyOrPoint(tx, ty, s.chainR);
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'echolith_penance_chain', state: 0, age: 0, cx: pc.x, cy: pc.y, target: target.entity, ax: tx, ay: ty, spell: s });
    SoundFX.playSweep(180, 520, 'sawtooth', 0.24, 0.24);
    return true;
  },
};

export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_mercy_guillotine(v) {
    const s = v.spell;
    if (v.age === 12) {
      const angle = Math.atan2(v.y2 - v.y1, v.x2 - v.x1);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const x1 = v.x2 - nx * s.bladeLen * 0.5;
      const y1 = v.y2 - ny * s.bladeLen * 0.5;
      const x2 = v.x2 + nx * s.bladeLen * 0.5;
      const y2 = v.y2 + ny * s.bladeLen * 0.5;
      damageEnemiesAlongSegment(x1, y1, x2, y2, 34, s.dmg, 4, s.c2);
      damageEnemiesInRadius(v.x2, v.y2, 58, 18, 2, s.color);
      state.shockwaves.push({ x: v.x2, y: v.y2, r: 0, maxR: 92, life: 14, maxLife: 14, color: s.c2 });
      state.shake(7);
    }
    if (v.age > 38) removeVfx(v);
  },

  echolith_sin_eater_lantern(v) {
    const s = v.spell;
    v.phase += 0.06;
    const target = nearestEnemyOrPoint(v.cx, v.cy, 260);
    v.cx += (target.x - v.cx) * 0.025 + Math.cos(v.phase) * 0.8;
    v.cy += (target.y - 46 - v.cy) * 0.025 + Math.sin(v.phase) * 0.5;
    if (v.age % 20 === 0) {
      const hits = damageEnemiesInRadius(v.cx, v.cy, s.lanternR, s.dmg, -1.5, s.c2);
      if (hits) healPlayer(1, s.color);
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 86, color: s.color, int: 0.8, life: 2, ml: 2 });
    if (v.age > s.lanternDur) removeVfx(v);
  },

  echolith_halo_debt(v) {
    const s = v.spell;
    if (isEnemyEntity(v.target)) {
      const c = bodyCenter(v.target);
      v.cx = c.x;
      v.cy = c.y - 8;
    }
    if (v.age > 0 && v.age % 24 === 0) {
      v.tolls += 1;
      damageEnemiesInRadius(v.cx, v.cy, 42 + v.tolls * 10, 6, 0, s.color);
      spawnP(v.cx, v.cy, s.c2, 6, 'sparkle');
    }
    if (v.tolls >= 3) {
      damageEnemiesInRadius(v.cx, v.cy, s.debtR, s.dmg, 5, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.debtR, life: 16, maxLife: 16, color: s.color });
      removeVfx(v);
    }
  },

  echolith_abyss_choirbook(v) {
    const s = v.spell;
    for (const page of v.pages) {
      page.phase += 0.16;
      if (page.spent) {
        page.x += page.vx;
        page.y += page.vy;
        continue;
      }
      const target = nearestEnemyOrPoint(page.x, page.y, 320);
      if (target.entity) {
        const dx = target.x - page.x;
        const dy = target.y - page.y;
        const d = Math.hypot(dx, dy) || 1;
        page.vx = page.vx * 0.82 + (dx / d) * 2.4;
        page.vy = page.vy * 0.82 + (dy / d) * 2.4;
        if (d < 16) {
          hurtEntity(target.entity, s.dmg, page.x, page.y);
          page.spent = true;
          spawnP(target.x, target.y, s.c2, 5, 'smoke');
        }
      }
      page.x += page.vx;
      page.y += page.vy;
    }
    if (v.age > 125 || v.pages.every((page) => page.spent)) removeVfx(v);
  },

  echolith_penance_chain(v) {
    const s = v.spell;
    const pc = playerCenter(v.cx, v.cy);
    v.cx = pc.x;
    v.cy = pc.y;
    if (!isEnemyEntity(v.target)) {
      const target = nearestEnemyOrPoint(v.ax, v.ay, s.chainR);
      v.target = target.entity;
      if (!v.target && v.age > 18) removeVfx(v);
      return;
    }
    const c = bodyCenter(v.target);
    const dx = v.cx - c.x;
    const dy = v.cy - c.y;
    const d = Math.hypot(dx, dy) || 1;
    v.target.vx += (dx / d) * 0.22;
    v.target.vy += (dy / d) * 0.12;
    if (v.age % 13 === 0) hurtEntity(v.target, s.dmg, v.cx, v.cy);
    if (d > s.chainR || v.age > s.chainDur) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_mercy_guillotine(v, X) {
    const s = v.spell;
    const a = v.age < 12 ? v.age / 12 : Math.max(0, 1 - (v.age - 12) / 26);
    drawEcholithHalo(X, v.x2, v.y2 - 52 * a, 36 + 10 * a, 10, v.age * 0.08, s.color, 0.55);
    drawBlade(X, v.x2, v.y2 - 90 * a, v.x2, v.y2 + 54 * a, 12, s.c2, s.core, a);
  },

  echolith_sin_eater_lantern(v, X) {
    const s = v.spell;
    drawRing(X, v.cx, v.cy, 20 + Math.sin(v.age * 0.12) * 3, s.color, 0.72, 2);
    drawEcholithScale(X, v.cx, v.cy + 8, 20, v.phase, s.color, s.c2, 0.52);
  },

  echolith_halo_debt(v, X) {
    const s = v.spell;
    drawEcholithSigil(X, 'good', v.cx, v.cy, 24 + v.tolls * 10, v.age * 0.08, { good: s.color, evil: EC.evil, core: s.core });
    drawRing(X, v.cx, v.cy, s.debtR * (v.tolls / 3 || 0.2), s.c2, 0.24, 2);
  },

  echolith_abyss_choirbook(v, X) {
    const s = v.spell;
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (const page of v.pages) {
      X.save();
      X.translate(page.x, page.y);
      X.rotate(Math.sin(page.phase) * 0.45);
      X.globalAlpha = page.spent ? 0.24 : 0.82;
      X.fillStyle = s.core;
      X.fillRect(-5, -8, 10, 16);
      X.strokeStyle = s.c2;
      X.strokeRect(-5, -8, 10, 16);
      X.restore();
    }
    X.restore();
  },

  echolith_penance_chain(v, X) {
    if (!isEnemyEntity(v.target)) return;
    const s = v.spell;
    const c = bodyCenter(v.target);
    drawBlade(X, v.cx, v.cy, c.x, c.y, 5, s.c2, s.core, 0.6);
    drawEcholithHorns(X, c.x, c.y - 12, 22, v.age * 0.08, s.c2, 0.34);
  },
};
