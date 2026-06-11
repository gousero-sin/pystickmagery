// nature-new.js — 5 spells novos do revamp da escola Nature.
// Importado por nature.js, que funde defs e handlers nos exports da escola.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { surfaceYAt, glowFX, shardFX, puffFX } from './fx-helpers.js?v=1';

export const DEFS = [
  { name: 'Thorn Lash', icon: '🌵', key: '9', color: '#3f8a2f', c2: '#7cc456', core: '#d9ffb0', speed: 0, dmg: 24, mana: 14, cd: 420, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'leaf', isThornLash: true, lashR: 64, desc: 'Chicote de espinhos varre um arco à frente' },
  { name: 'Verdant Lance', icon: '🎋', key: '0', color: '#2f7a3a', c2: '#6cc46a', core: '#e2ffc2', speed: 15, dmg: 26, mana: 16, cd: 380, r: 5, grav: .02, drag: 1, bounce: 0, exR: 20, exF: 3, trail: 'verdant', piercing: true, desc: 'Lança de madeira viva que brota um matagal no impacto' },
  { name: 'Pollen Wisps', icon: '✨', key: 'K', color: '#b9d44a', c2: '#e2f08a', core: '#fbffd9', speed: 4.5, dmg: 9, mana: 18, cd: 650, r: 3, grav: 0, drag: 1, bounce: 0, exR: 16, exF: 2, trail: 'wisp', isPollenWisps: true, wispCount: 4, desc: 'Fadas de pólen perseguem o inimigo mais próximo' },
  { name: 'Sap Snare', icon: '🍯', key: 'L', color: '#8a6a1f', c2: '#caa83e', core: '#ffe9a0', speed: 0, dmg: 18, mana: 22, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'leaf', isSapSnare: true, snareR: 64, snareDur: 110, desc: 'Seiva âmbar brota do chão e enraíza quem pisar' },
  { name: 'Petal Tempest', icon: '🌸', key: ';', color: '#d46a9c', c2: '#f0a4c4', core: '#ffe2ee', speed: 0, dmg: 6, mana: 30, cd: 1000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'leaf', isPetalTempest: true, petalDur: 90, petalR: 110, desc: 'Espiral de pétalas cortantes expande ao redor do mago' },
];

export const FIRE_HANDLERS = {
  isThornLash: (s, ox, oy, tx, ty) => {
    const dir = tx >= ox ? 1 : -1;
    state.vfxSequences.push({ type: 'nat_lash', state: 0, age: 0, spell: s, ox, oy, dir, hitSet: new Set() });
    SoundFX.playSweep(420, 180, 'sawtooth', 0.2, 0.18);
    return true;
  },
  isPollenWisps: (s, ox, oy, tx, ty) => {
    for (let i = 0; i < s.wispCount; i++) {
      const a = Math.atan2(ty - oy, tx - ox) + (i - (s.wispCount - 1) / 2) * 0.5;
      state.projectiles.push(createPlayerProjectile({
        x: ox, y: oy, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        spell: s, life: 200, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
        wispPhase: Math.random() * 9,
      }));
    }
    SoundFX.playSweep(600, 1200, 'sine', 0.3, 0.12);
    return true;
  },
  isSapSnare: (s, ox, oy, tx, ty) => {
    const gy = surfaceYAt(tx, ty);
    state.vfxSequences.push({ type: 'nat_snare', state: 0, age: 0, spell: s, tx, gy, rooted: new Set() });
    puffFX(tx, gy, 5, '#caa83e');
    SoundFX.playNoise(0.3, 0.25, 500, 'lowpass');
    return true;
  },
  isPetalTempest: (s) => {
    state.vfxSequences.push({
      type: 'nat_petals', state: 0, age: 0, spell: s,
      petals: Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2, r0: 8 + Math.random() * 10, sp: .8 + Math.random() * .6, sz: 2.4 + Math.random() * 2 })),
    });
    SoundFX.playSweep(500, 980, 'triangle', 0.4, 0.18);
    return true;
  },
};

export const TRAIL_EMITTERS = {
  verdant(p) {
    if (Math.random() < .5) {
      state.particles.push({
        x: p.x, y: p.y, vx: (Math.random() - .5) * .8, vy: (Math.random() - .5) * .8,
        life: 16, ml: 16, color: Math.random() > .5 ? '#6cc46a' : '#e2ffc2', size: 1.4, grav: .02, type: 'sparkle',
      });
    }
  },
  wisp(p) {
    state.particles.push({
      x: p.x, y: p.y, vx: 0, vy: -.2,
      life: 14, ml: 14, color: '#fbffd9', size: 1 + Math.random(), grav: 0, type: 'sparkle',
    });
  },
};

export const PROJ_DRAW = {
  verdant(p, s, X) {
    X.save(); X.translate(p.x, p.y); X.rotate(Math.atan2(p.vy, p.vx));
    glowFX(X, 0, 0, 14, 'rgba(226,255,194,.5)', 'rgba(47,122,58,.25)', .7);
    const g = X.createLinearGradient(-10, 0, 12, 0);
    g.addColorStop(0, '#2f5a22'); g.addColorStop(.7, '#5b9a44'); g.addColorStop(1, '#e2ffc2');
    X.fillStyle = g;
    X.beginPath(); X.moveTo(12, 0); X.lineTo(-8, -2.6); X.lineTo(-10, 0); X.lineTo(-8, 2.6); X.closePath(); X.fill();
    // Folhinhas laterais.
    X.fillStyle = '#6cc46a';
    X.beginPath(); X.ellipse(-3, -3.4, 3.2, 1.4, -.6, 0, Math.PI * 2); X.fill();
    X.beginPath(); X.ellipse(-5, 3.2, 3, 1.3, .6, 0, Math.PI * 2); X.fill();
    X.restore();
  },
  wisp(p, s, X) {
    const t = performance.now() * .01 + (p.wispPhase || 0);
    glowFX(X, p.x, p.y, 13, 'rgba(251,255,217,.8)', 'rgba(185,212,74,.4)', .8);
    X.save(); X.fillStyle = '#fbffd9';
    X.beginPath(); X.arc(p.x, p.y, 2.2, 0, Math.PI * 2); X.fill();
    // Asinhas batendo.
    X.globalAlpha = .7; X.fillStyle = '#e2f08a';
    const w = Math.sin(t * 3) * 3;
    X.beginPath(); X.ellipse(p.x - 3, p.y - 1, 3, 1.4 + w * .3, -.6, 0, Math.PI * 2); X.fill();
    X.beginPath(); X.ellipse(p.x + 3, p.y - 1, 3, 1.4 - w * .3, .6, 0, Math.PI * 2); X.fill();
    X.restore(); X.globalAlpha = 1;
  },
};

export const PROJ_HOOKS = {
  wisp: {
    onUpdate(p, s) {
      const e = nearestEnemyEntity(p.x, p.y, 260);
      if (e) {
        const a = Math.atan2(e.y + e.h / 2 - p.y, e.x + e.w / 2 - p.x);
        p.vx += Math.cos(a) * .34; p.vy += Math.sin(a) * .34;
        const sp = Math.hypot(p.vx, p.vy), max = 5.4;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      }
      p.vy += Math.sin((p.age + (p.wispPhase || 0) * 10) * .25) * .12;
      return false;
    },
  },
  verdant: {
    onLand(p, s) {
      const gy = surfaceYAt(p.x, p.y);
      state.vfxSequences.push({ type: 'nat_thicket', state: 0, age: 0, spell: s, tx: p.x, gy, hitSet: new Set() });
      puffFX(p.x, gy, 4, '#6cc46a');
      return false;
    },
  },
};

export const VFX_UPDATE = {
  nat_lash(v) {
    const s = v.spell;
    const t = v.age / 16;
    if (t <= 1) {
      const reach = s.lashR * Math.sin(t * Math.PI);
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        const dx = (e.x + e.w / 2 - v.ox) * v.dir, dy = Math.abs(e.y + e.h / 2 - v.oy);
        if (dx > 0 && dx < reach + 14 && dy < 40) {
          v.hitSet.add(e);
          hurtEntity(e, s.dmg, v.ox, v.oy);
          e.vx += v.dir * 4.5; e.vy -= 2.5;
          spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 6, 'burst');
        }
      }
    }
    if (v.age > 22) v.done = true;
  },
  nat_snare(v) {
    const s = v.spell;
    if (v.age < s.snareDur) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.tx) < s.snareR && Math.abs(e.y + e.h - v.gy) < 30) {
          if (!v.rooted.has(e)) {
            v.rooted.add(e);
            hurtEntity(e, s.dmg, v.tx, v.gy);
            spawnP(e.x + e.w / 2, e.y + e.h, '#caa83e', 8, 'burst');
            SoundFX.playTone(220, 'sine', 0.14, 0.2);
          }
          e.vx *= .55;
          e.stunned = Math.max(e.stunned || 0, 6);
          if (v.age % 30 === 0) hurtEntity(e, 3, v.tx, v.gy);
        }
      }
    }
    if (v.age > s.snareDur + 20) v.done = true;
  },
  nat_petals(v) {
    const s = v.spell;
    const p = state.player;
    v.cx = p.x + p.w / 2; v.cy = p.y + p.h / 2;
    const spread = Math.min(1, v.age / s.petalDur) * s.petalR;
    if (v.age % 8 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
        if (d < spread + 16 && d > spread * .3) {
          hurtEntity(e, s.dmg, v.cx, v.cy);
          spawnP(e.x + e.w / 2, e.y + e.h / 2, s.c2, 3, 'sparkle');
        }
      }
    }
    if (v.age > s.petalDur + 18) v.done = true;
  },
  nat_thicket(v) {
    const s = v.spell;
    if (v.age < 10) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.tx) < 34 && Math.abs(e.y + e.h - v.gy) < 40) {
          v.hitSet.add(e);
          hurtEntity(e, 12, v.tx, v.gy);
          e.vy = -5;
        }
      }
    }
    if (v.age > 80) v.done = true;
  },
};

export const VFX_DRAW = {
  nat_lash(v, X) {
    const s = v.spell;
    const t = Math.min(1, v.age / 16);
    const reach = s.lashR * Math.sin(t * Math.PI);
    const sweep = -0.9 + t * 1.8; // de cima para baixo
    X.save();
    X.translate(v.ox, v.oy);
    X.scale(v.dir, 1);
    X.strokeStyle = s.color; X.lineWidth = 3; X.lineCap = 'round';
    const ex = Math.cos(sweep) * reach, ey = Math.sin(sweep) * reach * .7;
    X.beginPath(); X.moveTo(0, 0);
    X.quadraticCurveTo(reach * .45, ey * .2 - 14 * (1 - t), ex, ey);
    X.stroke();
    // Espinhos ao longo do chicote.
    X.fillStyle = s.c2;
    for (let i = 1; i <= 4; i++) {
      const tt = i / 4.6;
      const px = ex * tt, py = ey * tt - 10 * (1 - t) * Math.sin(tt * Math.PI);
      X.beginPath(); X.moveTo(px, py - 4); X.lineTo(px + 2.4, py); X.lineTo(px - 2.4, py); X.closePath(); X.fill();
    }
    X.restore();
    glowFX(X, v.ox + v.dir * Math.cos(sweep) * reach, v.oy + Math.sin(sweep) * reach * .7, 18, 'rgba(217,255,176,.6)', 'transparent', 1 - t * .6);
  },
  nat_snare(v, X) {
    const s = v.spell;
    const grow = Math.min(1, v.age / 12);
    const fade = v.age > s.snareDur ? Math.max(0, 1 - (v.age - s.snareDur) / 20) : 1;
    if (fade <= 0) return;
    X.save();
    // Poça de seiva.
    X.globalAlpha = .5 * fade;
    const g = X.createRadialGradient(v.tx, v.gy, 2, v.tx, v.gy, s.snareR * grow);
    g.addColorStop(0, s.core); g.addColorStop(.6, s.c2); g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.beginPath(); X.ellipse(v.tx, v.gy, s.snareR * grow, 7 * grow, 0, 0, Math.PI * 2); X.fill();
    // Raízes serpenteando para cima.
    X.globalAlpha = .9 * fade;
    X.strokeStyle = s.color; X.lineWidth = 2; X.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const bx = v.tx + i * s.snareR * .32;
      const hh = (16 + Math.abs(i) * 4) * grow * (1 + Math.sin(v.age * .12 + i) * .12);
      X.beginPath(); X.moveTo(bx, v.gy);
      X.quadraticCurveTo(bx + Math.sin(v.age * .1 + i * 2) * 6, v.gy - hh * .6, bx + Math.sin(v.age * .07 + i) * 4, v.gy - hh);
      X.stroke();
    }
    X.restore(); X.globalAlpha = 1;
    glowFX(X, v.tx, v.gy - 6, 30 * grow, 'rgba(255,233,160,.35)', 'transparent', fade * .8);
  },
  nat_petals(v, X) {
    const s = v.spell;
    if (v.cx === undefined) return;
    const t = Math.min(1, v.age / s.petalDur);
    const fade = v.age > s.petalDur ? Math.max(0, 1 - (v.age - s.petalDur) / 18) : 1;
    glowFX(X, v.cx, v.cy, s.petalR * t * .8, 'rgba(255,226,238,.18)', 'rgba(212,106,156,.08)', fade);
    X.save();
    for (const pt of v.petals) {
      const a = pt.a + v.age * .06 * pt.sp;
      const r = pt.r0 + t * s.petalR * (.5 + pt.sp * .45);
      const px = v.cx + Math.cos(a) * r, py = v.cy + Math.sin(a) * r * .8;
      X.globalAlpha = (.5 + pt.sz * .1) * fade;
      X.save(); X.translate(px, py); X.rotate(a + Math.PI / 2);
      const g = X.createLinearGradient(0, -pt.sz, 0, pt.sz);
      g.addColorStop(0, '#ffe2ee'); g.addColorStop(1, s.color);
      X.fillStyle = g;
      X.beginPath(); X.ellipse(0, 0, pt.sz * .55, pt.sz, 0, 0, Math.PI * 2); X.fill();
      X.restore();
    }
    X.restore(); X.globalAlpha = 1;
  },
  nat_thicket(v, X) {
    const fade = Math.max(0, 1 - v.age / 80);
    const grow = Math.min(1, v.age / 8);
    for (let i = -1; i <= 1; i++) {
      shardFX(X, v.tx + i * 9, v.gy - (12 + Math.abs(i) * -4) * grow * .5, (14 - Math.abs(i) * 4) * grow, i * .3, '#6cc46a', '#2f5a22', fade);
    }
  },
};
