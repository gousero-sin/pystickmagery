// shenzhou-new.js — five compact cinematic Shenzhou spells.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import {
  bodyCenter,
  clamp,
  damageEnemiesAlongSegment,
  damageEnemiesInRadius,
  drawBlade,
  drawRing,
  healPlayer,
  nearestEnemyOrPoint,
  playerCenter,
  pushLightningBolt,
  removeVfx,
} from './revamp-helpers.js?v=1';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';

const SZ = {
  ink: '#1b1730',
  jade: '#35d48a',
  gold: '#ffc84a',
  vermilion: '#df2d18',
  paper: '#fff0c8',
  lotus: '#ff8ac8',
  clay: '#b06b33',
  core: '#fff8e7',
};

export const SPELL_DEFS = [
  {
    name: 'Ink Dragon Seal', icon: '🖌️', key: '4', category: 'Mark',
    color: SZ.ink, c2: SZ.gold, core: SZ.core,
    speed: 0, dmg: 36, mana: 28, cd: 1250, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isInkDragonSeal: true, sealR: 82,
    desc: 'A brushstroke dragon swims through the air, brands the target with gold ink, then pulses a slowing seal around them.',
  },
  {
    name: 'Vermilion Kite', icon: '🪁', key: '6', category: 'Homing',
    color: SZ.vermilion, c2: '#ffb34f', core: '#fff3d0',
    speed: 0, dmg: 10, mana: 30, cd: 1450, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_flame', isVermilionKite: true, kiteCount: 3, kiteDur: 150,
    desc: 'Three vermilion war kites orbit overhead, tug toward marked enemies, and dive in staggered fiery pecks.',
  },
  {
    name: 'Terracotta Phalanx', icon: '🏺', key: '7', category: 'Line',
    color: SZ.clay, c2: '#e0a65a', core: '#ffe0a0',
    speed: 0, dmg: 18, mana: 34, cd: 1850, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isTerracottaPhalanx: true, soldiers: 6, phalanxWidth: 58,
    desc: 'A terracotta rank rises from the floor and marches as a wedge, shoving enemies while each soldier lands one heavy spear thrust.',
  },
  {
    name: 'Paper Crane Chorus', icon: '折', key: '8', category: 'Swarm',
    color: SZ.paper, c2: SZ.jade, core: '#ffffff',
    speed: 0, dmg: 7, mana: 24, cd: 980, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isPaperCraneChorus: true, craneCount: 7,
    desc: 'Folded paper cranes lift from the sleeve, choose their own targets, and return a trickle of vitality as they cut past.',
  },
  {
    name: 'Lotus Reversal', icon: '🪷', key: '9', category: 'Counter',
    color: SZ.lotus, c2: '#ffd6ef', core: '#ffffff',
    speed: 0, dmg: 22, mana: 30, cd: 1650, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isLotusReversal: true, lotusR: 78, lotusDur: 150,
    desc: 'A lotus mirror blooms around the caster, catching hostile shots and turning each catch into a soft petal counterburst.',
  },
];

export const FIRE_HANDLERS = {
  isInkDragonSeal(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const target = nearestEnemyOrPoint(tx, ty, 360);
    state.vfxSequences.push({
      type: 'shenzhou_ink_dragon_seal', state: 0, age: 0,
      sx: pc.x, sy: pc.y, cx: target.x, cy: target.y, target: target.entity, spell: s,
    });
    SoundFX.playSweep(180, 680, 'triangle', 0.28, 0.34);
    spawnP(pc.x, pc.y, s.c2, 10, 'sparkle');
    return true;
  },

  isVermilionKite(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const kites = Array.from({ length: s.kiteCount }, (_, i) => ({
      x: pc.x + (i - 1) * 22,
      y: pc.y - 90 - i * 8,
      phase: i * 2.1,
      diveCd: 16 + i * 9,
    }));
    state.vfxSequences.push({ type: 'shenzhou_vermilion_kite', state: 0, age: 0, tx, ty, kites, spell: s });
    SoundFX.playTone(720, 'sine', 0.2, 0.22);
    return true;
  },

  isTerracottaPhalanx(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const angle = Math.atan2(ty - pc.y, tx - pc.x);
    state.vfxSequences.push({
      type: 'shenzhou_terracotta_phalanx', state: 0, age: 0,
      ox: pc.x, oy: pc.y, angle, spell: s, hit: new Set(),
    });
    SoundFX.playNoise(0.36, 0.26, 180, 'lowpass');
    state.shake(5);
    return true;
  },

  isPaperCraneChorus(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const cranes = Array.from({ length: s.craneCount }, (_, i) => ({
      x: pc.x + Math.cos(i) * 18,
      y: pc.y - 18 + Math.sin(i * 1.7) * 16,
      vx: Math.cos(i * 1.9) * 2,
      vy: -2 - Math.sin(i) * 0.6,
      hit: false,
    }));
    state.vfxSequences.push({ type: 'shenzhou_paper_crane_chorus', state: 0, age: 0, cranes, spell: s });
    SoundFX.playSweep(900, 1500, 'sine', 0.18, 0.24);
    return true;
  },

  isLotusReversal(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'shenzhou_lotus_reversal', state: 0, age: 0, cx: pc.x, cy: pc.y, catches: 0, spell: s });
    SoundFX.playTone(660, 'sine', 0.24, 0.35);
    spawnP(pc.x, pc.y, s.color, 18, 'sparkle');
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  shenzhou_ink_dragon_seal(v) {
    const s = v.spell;
    const target = v.target && isEnemyEntity(v.target) ? bodyCenter(v.target) : { x: v.cx, y: v.cy };
    v.cx = target.x;
    v.cy = target.y;
    if (v.age === 1) {
      pushLightningBolt(v.sx, v.sy, v.cx, v.cy, s.c2, 2, 9, 28);
      damageEnemiesInRadius(v.cx, v.cy, s.sealR, s.dmg, 3, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.sealR, life: 16, maxLife: 16, color: s.c2 });
    }
    if (v.age % 12 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const c = bodyCenter(e);
        if (Math.hypot(c.x - v.cx, c.y - v.cy) > s.sealR) continue;
        e.vx *= 0.86;
        e.vy *= 0.9;
        spawnP(c.x, c.y, s.color, 1, 'smoke');
      }
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.sealR, color: s.c2, int: 0.9, life: 2, ml: 2 });
    if (v.age > 74) removeVfx(v);
  },

  shenzhou_vermilion_kite(v) {
    const s = v.spell;
    for (const kite of v.kites) {
      kite.phase += 0.18;
      const target = nearestEnemyOrPoint(kite.x, kite.y, 260);
      kite.x += (target.x - kite.x) * 0.035 + Math.cos(kite.phase) * 1.6;
      kite.y += (target.y - 52 - kite.y) * 0.035 + Math.sin(kite.phase * 1.3) * 0.8;
      kite.diveCd -= 1;
      if (kite.diveCd <= 0 && target.entity) {
        kite.diveCd = 34;
        const c = bodyCenter(target.entity);
        hurtEntity(target.entity, s.dmg, kite.x, kite.y);
        pushLightningBolt(kite.x, kite.y, c.x, c.y, s.c2, 1.4, 5, 16);
        spawnP(c.x, c.y, s.color, 6, 'ember');
      }
    }
    if (v.age > s.kiteDur) removeVfx(v);
  },

  shenzhou_terracotta_phalanx(v) {
    const s = v.spell;
    const dist = clamp(v.age * 5.6, 0, 430);
    const nx = Math.cos(v.angle);
    const ny = Math.sin(v.angle);
    const cx = v.ox + nx * dist;
    const cy = v.oy + ny * dist;
    damageEnemiesAlongSegment(
      cx - ny * s.phalanxWidth,
      cy + nx * s.phalanxWidth,
      cx + ny * s.phalanxWidth,
      cy - nx * s.phalanxWidth,
      38,
      s.dmg,
      5,
      s.c2,
      v.hit,
    );
    if (v.age % 5 === 0) spawnP(cx, cy, s.color, 4, 'dust');
    if (v.age > 82) removeVfx(v);
  },

  shenzhou_paper_crane_chorus(v) {
    const s = v.spell;
    for (const crane of v.cranes) {
      if (crane.hit) {
        crane.x += crane.vx;
        crane.y += crane.vy;
        continue;
      }
      const target = nearestEnemyOrPoint(crane.x, crane.y, 340);
      if (target.entity) {
        const dx = target.x - crane.x;
        const dy = target.y - crane.y;
        const d = Math.hypot(dx, dy) || 1;
        crane.vx = crane.vx * 0.84 + (dx / d) * 2.1;
        crane.vy = crane.vy * 0.84 + (dy / d) * 2.1;
        if (d < 16) {
          hurtEntity(target.entity, s.dmg, crane.x, crane.y);
          healPlayer(1, s.c2);
          crane.hit = true;
          spawnP(target.x, target.y, s.c2, 5, 'sparkle');
        }
      }
      crane.x += crane.vx;
      crane.y += crane.vy;
    }
    if (v.age > 118 || v.cranes.every((crane) => crane.hit)) removeVfx(v);
  },

  shenzhou_lotus_reversal(v) {
    const s = v.spell;
    const pc = playerCenter(v.cx, v.cy);
    v.cx = pc.x;
    v.cy = pc.y;
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = state.enemyProjectiles[i];
      const px = p.x ?? p.cx ?? 0;
      const py = p.y ?? p.cy ?? 0;
      if (Math.hypot(px - v.cx, py - v.cy) > s.lotusR) continue;
      state.enemyProjectiles.splice(i, 1);
      v.catches += 1;
      damageEnemiesInRadius(px, py, 58, s.dmg, 2, s.color);
      healPlayer(2, s.core);
      state.shockwaves.push({ x: px, y: py, r: 0, maxR: 58, life: 12, maxLife: 12, color: s.color });
    }
    if (v.age % 20 === 0 && v.catches > 0) damageEnemiesInRadius(v.cx, v.cy, s.lotusR, 8, 1, s.c2);
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.lotusR, color: s.color, int: 0.7, life: 2, ml: 2 });
    if (v.age > s.lotusDur) removeVfx(v);
  },
};

export const VFX_DRAW = {
  shenzhou_ink_dragon_seal(v, X) {
    const s = v.spell;
    const a = Math.max(0, 1 - v.age / 74);
    drawBlade(X, v.sx, v.sy, v.cx, v.cy, 9 * a, s.color, s.c2, 0.5 * a);
    drawRing(X, v.cx, v.cy, s.sealR * (0.7 + 0.3 * Math.sin(v.age * 0.18)), s.c2, 0.55 * a, 3);
  },

  shenzhou_vermilion_kite(v, X) {
    const s = v.spell;
    for (const kite of v.kites) {
      X.save();
      X.translate(kite.x, kite.y);
      X.rotate(Math.sin(kite.phase) * 0.28);
      X.globalCompositeOperation = 'lighter';
      X.fillStyle = s.color;
      X.beginPath();
      X.moveTo(0, -13);
      X.lineTo(14, 0);
      X.lineTo(0, 13);
      X.lineTo(-14, 0);
      X.closePath();
      X.fill();
      X.strokeStyle = s.core;
      X.lineWidth = 1;
      X.beginPath();
      X.moveTo(-14, 0);
      X.lineTo(14, 0);
      X.moveTo(0, -13);
      X.lineTo(0, 13);
      X.stroke();
      X.restore();
    }
  },

  shenzhou_terracotta_phalanx(v, X) {
    const s = v.spell;
    const dist = clamp(v.age * 5.6, 0, 430);
    const nx = Math.cos(v.angle);
    const ny = Math.sin(v.angle);
    const cx = v.ox + nx * dist;
    const cy = v.oy + ny * dist;
    X.save();
    X.translate(cx, cy);
    X.rotate(v.angle);
    for (let i = 0; i < s.soldiers; i++) {
      const off = (i - (s.soldiers - 1) / 2) * 18;
      X.fillStyle = i % 2 ? s.color : s.c2;
      X.fillRect(-9, off - 13, 18, 26);
      X.fillStyle = s.core;
      X.fillRect(8, off - 2, 26, 4);
    }
    X.restore();
  },

  shenzhou_paper_crane_chorus(v, X) {
    const s = v.spell;
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (const crane of v.cranes) {
      X.globalAlpha = crane.hit ? 0.25 : 0.9;
      X.fillStyle = crane.hit ? s.c2 : s.core;
      X.beginPath();
      X.moveTo(crane.x, crane.y - 5);
      X.lineTo(crane.x + 12, crane.y + 4);
      X.lineTo(crane.x, crane.y + 1);
      X.lineTo(crane.x - 12, crane.y + 4);
      X.closePath();
      X.fill();
    }
    X.restore();
  },

  shenzhou_lotus_reversal(v, X) {
    const s = v.spell;
    const petals = 10;
    X.save();
    X.translate(v.cx, v.cy);
    X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < petals; i++) {
      const a = (Math.PI * 2 * i) / petals + v.age * 0.045;
      X.save();
      X.rotate(a);
      X.globalAlpha = 0.58;
      X.fillStyle = i % 2 ? s.color : s.c2;
      X.beginPath();
      X.ellipse(s.lotusR * 0.64, 0, 18, 6, 0, 0, Math.PI * 2);
      X.fill();
      X.restore();
    }
    drawRing(X, 0, 0, s.lotusR, s.core, 0.42, 2);
    X.restore();
  },
};
