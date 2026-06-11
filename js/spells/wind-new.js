// wind-new.js — 5 spells novos do revamp da escola Wind.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { surfaceYAt, glowFX, beamFX, puffFX } from './fx-helpers.js?v=1';

export const DEFS = [
  { name: 'Gale Crescent', icon: '🌙', key: '8', color: '#bfeee0', c2: '#e8fff6', core: '#ffffff', speed: 11, dmg: 16, mana: 12, cd: 360, r: 5, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'crescent', piercing: true, isGaleCrescent: true, desc: 'Lâmina-bumerangue de vento que volta para a mão' },
  { name: 'Tempest Spear', icon: '🔱', key: 'T', color: '#9fe0e8', c2: '#d8f8ff', core: '#ffffff', speed: 24, dmg: 22, mana: 14, cd: 300, r: 4, grav: 0, drag: 1, bounce: 0, exR: 18, exF: 4, trail: 'tempest', piercing: true, desc: 'Lança de ar comprimido com cone de vapor' },
  { name: 'Downburst', icon: '⬇️', key: 'Y', color: '#a8ccd8', c2: '#d8eef4', core: '#ffffff', speed: 0, dmg: 20, mana: 22, cd: 700, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isDownburst: true, burstR: 56, desc: 'Coluna de ar despenca e esmaga contra o chão' },
  { name: 'Wind Shear', icon: '✂️', key: 'P', color: '#cfeee8', c2: '#f0fffb', core: '#ffffff', speed: 0, dmg: 28, mana: 24, cd: 820, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isWindShear: true, shearR: 52, desc: 'Duas lâminas cruzam em X sobre o alvo' },
  { name: 'Zephyr Chimes', icon: '🎐', key: 'Q', color: '#b8e8e0', c2: '#e4fff8', core: '#ffffff', speed: 0, dmg: 8, mana: 30, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isZephyrChimes: true, chimeDur: 340, desc: 'Sinos de vento flutuam e disparam dardos de ar sozinhos' },
];

export const FIRE_HANDLERS = {
  isDownburst: (s, ox, oy, tx, ty) => {
    const gy = surfaceYAt(tx, ty);
    state.vfxSequences.push({ type: 'wnd_downburst', state: 0, age: 0, spell: s, tx, gy, hitSet: new Set() });
    SoundFX.playSweep(900, 140, 'sine', 0.35, 0.25);
    return true;
  },
  isWindShear: (s, ox, oy, tx, ty) => {
    state.vfxSequences.push({ type: 'wnd_shear', state: 0, age: 0, spell: s, tx, ty, hitSet: new Set() });
    SoundFX.playSweep(700, 1500, 'sawtooth', 0.18, 0.12);
    return true;
  },
  isZephyrChimes: (s) => {
    state.vfxSequences.push({
      type: 'wnd_chimes', state: 0, age: 0, spell: s,
      chimes: [{ o: -26, cd: 30 }, { o: 0, cd: 60 }, { o: 26, cd: 90 }],
    });
    SoundFX.playTone(1320, 'sine', 0.2, 0.18);
    SoundFX.playTone(1760, 'sine', 0.18, 0.22);
    return true;
  },
};

export const TRAIL_EMITTERS = {
  crescent(p) {
    if (Math.random() < .7) {
      state.particles.push({
        x: p.x, y: p.y, vx: -p.vx * .03, vy: -p.vy * .03,
        life: 12, ml: 12, color: '#e8fff6', size: 1 + Math.random(), grav: 0, type: 'sparkle',
      });
    }
  },
  tempest(p) {
    state.particles.push({
      x: p.x - p.vx * .4, y: p.y - p.vy * .4, vx: (Math.random() - .5) * 1.4, vy: (Math.random() - .5) * 1.4,
      life: 10, ml: 10, color: '#d8f8ff', size: 1.2, grav: 0, type: 'sparkle',
    });
  },
};

export const PROJ_DRAW = {
  crescent(p, s, X) {
    X.save(); X.translate(p.x, p.y); X.rotate((p.age || 0) * .5);
    glowFX(X, 0, 0, 14, 'rgba(255,255,255,.5)', 'rgba(191,238,224,.25)', .7);
    X.strokeStyle = s.core; X.lineWidth = 2.6; X.lineCap = 'round';
    X.beginPath(); X.arc(0, 0, 7, -.6, Math.PI * .75); X.stroke();
    X.strokeStyle = s.color; X.lineWidth = 1.4;
    X.beginPath(); X.arc(0, 0, 4.6, -.4, Math.PI * .7); X.stroke();
    X.restore();
  },
  tempest(p, s, X) {
    const a = Math.atan2(p.vy, p.vx);
    X.save(); X.translate(p.x, p.y); X.rotate(a);
    glowFX(X, 0, 0, 16, 'rgba(255,255,255,.6)', 'rgba(159,224,232,.3)', .8);
    const g = X.createLinearGradient(-16, 0, 12, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(.6, s.color); g.addColorStop(1, '#ffffff');
    X.fillStyle = g;
    X.beginPath(); X.moveTo(12, 0); X.lineTo(-14, -3.4); X.lineTo(-9, 0); X.lineTo(-14, 3.4); X.closePath(); X.fill();
    // Cone de vapor.
    X.strokeStyle = 'rgba(216,248,255,.5)'; X.lineWidth = 1;
    X.beginPath(); X.moveTo(6, -5); X.quadraticCurveTo(-4, -8, -16, -7); X.stroke();
    X.beginPath(); X.moveTo(6, 5); X.quadraticCurveTo(-4, 8, -16, 7); X.stroke();
    X.restore();
  },
};

export const PROJ_HOOKS = {
  crescent: {
    onUpdate(p, s) {
      // Bumerangue: após 26 frames, curva de volta para o mago.
      if (p.age > 26) {
        const pl = state.player;
        const a = Math.atan2(pl.y + pl.h / 2 - p.y, pl.x + pl.w / 2 - p.x);
        p.vx += Math.cos(a) * .9; p.vy += Math.sin(a) * .9;
        const sp = Math.hypot(p.vx, p.vy), max = 13;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
        if (p.age > 34 && Math.hypot(pl.x + pl.w / 2 - p.x, pl.y + pl.h / 2 - p.y) < 16) {
          spawnP(p.x, p.y, s.core, 4, 'sparkle');
          return true; // recolhida
        }
        // Permite re-acertar na volta.
        if (p.age === 40) p.hitList.length = 0;
      }
      return false;
    },
  },
};

export const VFX_UPDATE = {
  wnd_downburst(v) {
    const s = v.spell;
    if (v.age === 8) {
      state.shake(3.5);
      SoundFX.playNoise(0.3, 0.4, 600, 'lowpass');
      puffFX(v.tx - s.burstR * .7, v.gy, 4, '#d8eef4', 3);
      puffFX(v.tx + s.burstR * .7, v.gy, 4, '#d8eef4', 3);
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.tx) < s.burstR && e.y + e.h > v.gy - 130 && e.y < v.gy + 10) {
          v.hitSet.add(e);
          hurtEntity(e, s.dmg, v.tx, e.y);
          e.vy = 10; e.vx += (e.x + e.w / 2 > v.tx ? 1 : -1) * 3;
          spawnP(e.x + e.w / 2, e.y + e.h, '#ffffff', 6, 'burst');
        }
      }
    }
    if (v.age > 34) v.done = true;
  },
  wnd_shear(v) {
    const s = v.spell;
    if (v.age === 6 || v.age === 14) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        if (Math.hypot(e.x + e.w / 2 - v.tx, e.y + e.h / 2 - v.ty) < s.shearR) {
          if (v.age === 14) v.hitSet.add(e);
          hurtEntity(e, s.dmg / 2, v.tx, v.ty);
          spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 4, 'sparkle');
        }
      }
      SoundFX.playSweep(1100, 400, 'sawtooth', 0.12, 0.1);
    }
    if (v.age > 30) v.done = true;
  },
  wnd_chimes(v) {
    const s = v.spell;
    const p = state.player;
    for (const c of v.chimes) {
      c.x = p.x + p.w / 2 + c.o; c.y = p.y - 26 + Math.sin(v.age * .06 + c.o) * 3;
      if (--c.cd <= 0) {
        const e = nearestEnemyEntity(c.x, c.y, 300);
        if (e) {
          const a = Math.atan2(e.y + e.h / 2 - c.y, e.x + e.w / 2 - c.x);
          state.projectiles.push(createPlayerProjectile({
            x: c.x, y: c.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12,
            spell: { ...s, trail: 'tempest', dmg: s.dmg, r: 3, exR: 10, exF: 2, piercing: false },
            life: 70, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
          }));
          SoundFX.playTone(1560 + Math.random() * 400, 'sine', 0.08, 0.12);
          spawnP(c.x, c.y, s.core, 3, 'sparkle');
        }
        c.cd = 46 + Math.random() * 20;
      }
    }
    if (v.age > s.chimeDur) v.done = true;
  },
};

export const VFX_DRAW = {
  wnd_downburst(v, X) {
    const s = v.spell;
    const t = Math.min(1, v.age / 8);
    const fade = v.age > 8 ? Math.max(0, 1 - (v.age - 8) / 26) : 1;
    // Coluna descendo.
    const colH = 130 * t;
    X.save();
    X.globalAlpha = .5 * fade;
    const g = X.createLinearGradient(0, v.gy - 130, 0, v.gy);
    g.addColorStop(0, 'transparent'); g.addColorStop(.7, s.c2); g.addColorStop(1, s.core);
    X.fillStyle = g;
    X.fillRect(v.tx - s.burstR * .55, v.gy - colH, s.burstR * 1.1, colH);
    // Linhas de fluxo.
    X.strokeStyle = '#ffffff'; X.lineWidth = 1.4; X.globalAlpha = .65 * fade;
    for (let i = -2; i <= 2; i++) {
      const lx = v.tx + i * s.burstR * .26;
      X.beginPath(); X.moveTo(lx, v.gy - colH + Math.abs(i) * 14); X.lineTo(lx, v.gy - 4); X.stroke();
    }
    X.restore(); X.globalAlpha = 1;
    if (v.age >= 8) {
      // Anel de impacto rasante.
      const rt = (v.age - 8) / 26;
      X.save(); X.globalAlpha = (1 - rt) * .7;
      X.strokeStyle = s.core; X.lineWidth = 2.4;
      X.beginPath(); X.ellipse(v.tx, v.gy, s.burstR * (0.4 + rt * 1.4), 6 + rt * 4, 0, 0, Math.PI * 2); X.stroke();
      X.restore(); X.globalAlpha = 1;
    }
  },
  wnd_shear(v, X) {
    const s = v.spell;
    const fade = Math.max(0, 1 - v.age / 30);
    glowFX(X, v.tx, v.ty, s.shearR, 'rgba(255,255,255,.25)', 'rgba(207,238,232,.1)', fade);
    const draw = (rot, prog) => {
      if (prog <= 0) return;
      const len = s.shearR * 1.5 * Math.min(1, prog);
      beamFX(X, v.tx - Math.cos(rot) * len, v.ty - Math.sin(rot) * len, v.tx + Math.cos(rot) * len, v.ty + Math.sin(rot) * len, 3, '#ffffff', s.c2, fade);
    };
    draw(.7, v.age / 6);
    draw(-.7, (v.age - 8) / 6);
  },
  wnd_chimes(v, X) {
    const s = v.spell;
    const fade = Math.min(1, v.age / 12) * Math.min(1, (s.chimeDur - v.age) / 16);
    for (const c of v.chimes) {
      if (c.x === undefined) continue;
      glowFX(X, c.x, c.y, 12, 'rgba(255,255,255,.5)', 'rgba(184,232,224,.2)', fade);
      X.save(); X.globalAlpha = fade;
      X.strokeStyle = s.color; X.lineWidth = 1;
      X.beginPath(); X.moveTo(c.x, c.y - 10); X.lineTo(c.x, c.y - 4); X.stroke();
      const g = X.createLinearGradient(c.x, c.y - 4, c.x, c.y + 6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, s.color);
      X.fillStyle = g;
      X.beginPath(); X.moveTo(c.x - 3, c.y - 4); X.lineTo(c.x + 3, c.y - 4); X.lineTo(c.x + 2.2, c.y + 5); X.lineTo(c.x - 2.2, c.y + 5); X.closePath(); X.fill();
      X.fillStyle = '#ffffff';
      X.beginPath(); X.arc(c.x, c.y + 7 + Math.sin(v.age * .2 + c.o) * 1.4, 1.2, 0, Math.PI * 2); X.fill();
      X.restore(); X.globalAlpha = 1;
    }
  },
};
