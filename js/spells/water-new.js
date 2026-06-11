// water-new.js — 5 spells novos do revamp da escola Water.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { surfaceYAt, glowFX, puffFX } from './fx-helpers.js?v=1';

export const DEFS = [
  { name: 'Aqua Javelin', icon: '🔱', key: '2', color: '#3a9ae8', c2: '#8cd4ff', core: '#e8f8ff', speed: 18, dmg: 20, mana: 14, cd: 340, r: 4, grav: .01, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'javelin', isAquaJavelin: true, desc: 'Dardo pressurizado que estilhaça em gotas perfurantes' },
  { name: 'Brine Mortar', icon: '💧', key: 'R', color: '#1f6aa8', c2: '#5aa8d8', core: '#cdeeff', speed: 7, dmg: 30, mana: 20, cd: 600, r: 7, grav: .24, drag: .999, bounce: 0, exR: 60, exF: 9, trail: 'brine', isBrineMortar: true, puddleDur: 200, desc: 'Glóbulo salgado em arco — splash pesado e poça que atrasa' },
  { name: 'Bubble Snare', icon: '🫧', key: 'G', color: '#6ec8f0', c2: '#b8eaff', core: '#ffffff', speed: 0, dmg: 16, mana: 26, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isBubbleSnare: true, snareR: 80, liftDur: 80, desc: 'Bolhas capturam inimigos e os erguem — estouram no fim' },
  { name: 'Cascade', icon: '🌊', key: 'H', color: '#2a7ac8', c2: '#74b8e8', core: '#e0f4ff', speed: 0, dmg: 5, mana: 28, cd: 950, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isCascade: true, cascDur: 80, cascW: 46, desc: 'Cachoeira despenca do alto e mói quem ficar embaixo' },
  { name: 'Undine Orb', icon: '🧜', key: 'L', color: '#4ab8d8', c2: '#9ae4f4', core: '#ffffff', speed: 0, dmg: 9, mana: 30, cd: 1500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isUndineOrb: true, orbDur: 330, healAmt: 0.22, desc: 'Espírito d’água orbita o mago: cura e cospe gotas nos inimigos' },
];

export const FIRE_HANDLERS = {
  isBubbleSnare: (s, ox, oy, tx, ty) => {
    const caught = [];
    for (const e of state.entities) {
      if (!isEnemyEntity(e) || caught.length >= 3) continue;
      if (Math.hypot(e.x + e.w / 2 - tx, e.y + e.h / 2 - ty) < s.snareR) caught.push(e);
    }
    state.vfxSequences.push({ type: 'wat_bubbles', state: 0, age: 0, spell: s, tx, ty, caught });
    SoundFX.playSweep(300, 900, 'sine', 0.3, 0.2);
    spawnP(tx, ty, s.c2, 8, 'sparkle');
    return true;
  },
  isCascade: (s, ox, oy, tx, ty) => {
    const gy = surfaceYAt(tx, ty);
    state.vfxSequences.push({
      type: 'wat_cascade', state: 0, age: 0, spell: s, tx, gy,
      streams: Array.from({ length: 7 }, (_, i) => ({ o: (i / 6 - .5), ph: Math.random() * 9 })),
    });
    SoundFX.playNoise(0.9, 0.35, 1100, 'bandpass');
    return true;
  },
  isUndineOrb: (s) => {
    state.vfxSequences.push({ type: 'wat_undine', state: 0, age: 0, spell: s, a: 0, shootCd: 50 });
    SoundFX.playSweep(500, 1100, 'sine', 0.35, 0.16);
    return true;
  },
};

export const TRAIL_EMITTERS = {
  javelin(p) {
    state.particles.push({
      x: p.x - p.vx * .3, y: p.y - p.vy * .3, vx: (Math.random() - .5), vy: (Math.random() - .5),
      life: 10, ml: 10, color: '#8cd4ff', size: 1.2, grav: .04, type: 'sparkle',
    });
  },
  brine(p) {
    if (Math.random() < .6) {
      state.particles.push({
        x: p.x, y: p.y, vx: (Math.random() - .5) * .8, vy: -Math.random() * .5,
        life: 14, ml: 14, color: Math.random() > .5 ? '#5aa8d8' : '#cdeeff', size: 1.4, grav: .12, type: 'burst',
      });
    }
  },
};

export const PROJ_DRAW = {
  javelin(p, s, X) {
    const a = Math.atan2(p.vy, p.vx);
    X.save(); X.translate(p.x, p.y); X.rotate(a);
    glowFX(X, 0, 0, 13, 'rgba(232,248,255,.6)', 'rgba(58,154,232,.3)', .8);
    const g = X.createLinearGradient(-12, 0, 12, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(.55, s.color); g.addColorStop(1, '#ffffff');
    X.fillStyle = g;
    X.beginPath(); X.moveTo(12, 0); X.lineTo(-10, -2.8); X.lineTo(-6, 0); X.lineTo(-10, 2.8); X.closePath(); X.fill();
    X.strokeStyle = 'rgba(255,255,255,.7)'; X.lineWidth = .8;
    X.beginPath(); X.moveTo(10, 0); X.lineTo(-6, -1.2); X.stroke();
    X.restore();
  },
  brine(p, s, X) {
    glowFX(X, p.x, p.y, 16, 'rgba(205,238,255,.5)', 'rgba(31,106,168,.3)', .7);
    X.save(); X.translate(p.x, p.y);
    const wob = 1 + Math.sin((p.age || 0) * .4) * .14;
    const g = X.createRadialGradient(-2, -2, 1, 0, 0, 8);
    g.addColorStop(0, '#cdeeff'); g.addColorStop(.6, s.color); g.addColorStop(1, '#14507e');
    X.fillStyle = g;
    X.beginPath(); X.ellipse(0, 0, 7 * wob, 7 / wob, 0, 0, Math.PI * 2); X.fill();
    X.fillStyle = 'rgba(255,255,255,.6)';
    X.beginPath(); X.ellipse(-2, -2.4, 2, 1.2, -.5, 0, Math.PI * 2); X.fill();
    X.restore();
  },
};

export const PROJ_HOOKS = {
  javelin: {
    onLand(p, s) {
      // Estilhaça em 5 gotas perfurantes.
      for (let i = 0; i < 5; i++) {
        const a = Math.atan2(p.vy, p.vx) + (i - 2) * .5;
        state.projectiles.push(createPlayerProjectile({
          x: p.x, y: p.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6 - 1.4,
          spell: { ...s, trail: 'javelin', dmg: 7, r: 2.6, exR: 0, isAquaJavelin: false, _hook: null },
          life: 50, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
        }));
      }
      spawnP(p.x, p.y, s.core, 8, 'burst');
      SoundFX.playNoise(0.16, 0.3, 1600, 'highpass');
      return false;
    },
  },
  brine: {
    onLand(p, s) {
      const gy = surfaceYAt(p.x, p.y);
      state.vfxSequences.push({ type: 'wat_puddle', state: 0, age: 0, spell: s, tx: p.x, gy });
      puffFX(p.x, gy, 6, '#5aa8d8', 3);
      state.shake(2);
      return false;
    },
  },
};

export const VFX_UPDATE = {
  wat_bubbles(v) {
    const s = v.spell;
    if (v.age < s.liftDur) {
      for (const e of v.caught) {
        if (!e.active) continue;
        e.vx *= .8; e.vy = -1.6;
        e.stunned = Math.max(e.stunned || 0, 4);
      }
    } else if (v.age === s.liftDur) {
      for (const e of v.caught) {
        if (!e.active) continue;
        hurtEntity(e, s.dmg, e.x + e.w / 2, e.y + e.h / 2);
        e.vy = 3;
        spawnP(e.x + e.w / 2, e.y + e.h / 2, s.c2, 10, 'burst');
      }
      SoundFX.playNoise(0.2, 0.35, 2000, 'highpass');
    }
    if (v.age > s.liftDur + 16) v.done = true;
  },
  wat_cascade(v) {
    const s = v.spell;
    if (v.age < s.cascDur) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.tx) < s.cascW / 2 + 6 && e.y + e.h > v.gy - 150 && e.y < v.gy + 8) {
          e.vy = Math.max(e.vy, 3.2); e.vx *= .9;
          if (v.age % 12 === 0) {
            hurtEntity(e, s.dmg, v.tx, e.y);
            spawnP(e.x + e.w / 2, e.y, '#e0f4ff', 3, 'sparkle');
          }
        }
      }
      if (v.age % 4 === 0) puffFX(v.tx + (Math.random() - .5) * s.cascW, v.gy, 1, '#cdeeff', 2.4, 'sparkle');
    }
    if (v.age > s.cascDur + 14) v.done = true;
  },
  wat_undine(v) {
    const s = v.spell;
    const p = state.player;
    v.a += .055;
    v.x = p.x + p.w / 2 + Math.cos(v.a) * 30;
    v.y = p.y + p.h / 2 + Math.sin(v.a) * 22 - 6;
    if (v.age % 26 === 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + s.healAmt * 4);
      spawnP(p.x + p.w / 2, p.y + 4, '#9ae4f4', 2, 'sparkle');
    }
    if (--v.shootCd <= 0) {
      const e = nearestEnemyEntity(v.x, v.y, 280);
      if (e) {
        const a = Math.atan2(e.y + e.h / 2 - v.y, e.x + e.w / 2 - v.x);
        state.projectiles.push(createPlayerProjectile({
          x: v.x, y: v.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9,
          spell: { ...s, trail: 'javelin', dmg: s.dmg, r: 3, exR: 12, exF: 2 },
          life: 80, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
        }));
        SoundFX.playTone(880, 'sine', 0.08, 0.1);
      }
      v.shootCd = 44;
    }
    if (v.age > s.orbDur) {
      spawnP(v.x, v.y, s.c2, 10, 'sparkle');
      v.done = true;
    }
  },
  wat_puddle(v) {
    const s = v.spell;
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      if (Math.abs(e.x + e.w / 2 - v.tx) < 44 && Math.abs(e.y + e.h - v.gy) < 10) {
        e.vx *= .9;
      }
    }
    if (v.age > s.puddleDur) v.done = true;
  },
};

export const VFX_DRAW = {
  wat_bubbles(v, X) {
    const s = v.spell;
    const fade = v.age > s.liftDur ? Math.max(0, 1 - (v.age - s.liftDur) / 14) : Math.min(1, v.age / 10);
    for (const e of v.caught) {
      if (!e.active) continue;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const r = Math.max(e.w, e.h) * .75 + 4 + Math.sin(v.age * .15) * 1.6;
      X.save(); X.globalAlpha = .55 * fade;
      const g = X.createRadialGradient(cx - r * .3, cy - r * .3, 1, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.5, 'rgba(184,234,255,.25)'); g.addColorStop(1, 'rgba(110,200,240,.5)');
      X.fillStyle = g;
      X.beginPath(); X.arc(cx, cy, r, 0, Math.PI * 2); X.fill();
      X.strokeStyle = 'rgba(255,255,255,.8)'; X.lineWidth = 1.2; X.stroke();
      X.beginPath(); X.ellipse(cx - r * .4, cy - r * .42, r * .2, r * .1, -.6, 0, Math.PI * 2);
      X.fillStyle = 'rgba(255,255,255,.85)'; X.fill();
      X.restore(); X.globalAlpha = 1;
    }
    glowFX(X, v.tx, v.ty, s.snareR * .8, 'rgba(184,234,255,.18)', 'transparent', fade * .8);
  },
  wat_cascade(v, X) {
    const s = v.spell;
    const fade = Math.min(1, v.age / 10) * Math.min(1, (s.cascDur + 10 - v.age) / 14);
    if (fade <= 0) return;
    X.save();
    const topY = v.gy - 160;
    X.globalAlpha = .55 * fade;
    const g = X.createLinearGradient(0, topY, 0, v.gy);
    g.addColorStop(0, 'transparent'); g.addColorStop(.25, s.c2); g.addColorStop(1, s.core);
    X.fillStyle = g;
    X.fillRect(v.tx - s.cascW / 2, topY, s.cascW, v.gy - topY);
    // Filetes ondulando.
    X.strokeStyle = '#ffffff'; X.lineWidth = 1.6; X.lineCap = 'round';
    for (const st of v.streams) {
      const sx = v.tx + st.o * s.cascW * .9;
      X.globalAlpha = (.3 + Math.abs(Math.sin(v.age * .2 + st.ph)) * .4) * fade;
      X.beginPath();
      X.moveTo(sx, topY + 16);
      X.quadraticCurveTo(sx + Math.sin(v.age * .18 + st.ph) * 4, (topY + v.gy) / 2, sx + Math.sin(v.age * .12 + st.ph) * 3, v.gy - 3);
      X.stroke();
    }
    // Espuma na base.
    X.globalAlpha = .6 * fade;
    X.fillStyle = '#ffffff';
    X.beginPath(); X.ellipse(v.tx, v.gy, s.cascW * .72, 7 + Math.sin(v.age * .3) * 1.6, 0, 0, Math.PI * 2); X.fill();
    X.restore(); X.globalAlpha = 1;
  },
  wat_undine(v, X) {
    if (v.x === undefined) return;
    const s = v.spell;
    const fade = Math.min(1, v.age / 14) * Math.min(1, (s.orbDur - v.age) / 16);
    glowFX(X, v.x, v.y, 18, 'rgba(255,255,255,.6)', 'rgba(74,184,216,.3)', fade);
    X.save(); X.globalAlpha = fade;
    const g = X.createRadialGradient(v.x - 2, v.y - 2, 1, v.x, v.y, 7);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.6, s.c2); g.addColorStop(1, s.color);
    X.fillStyle = g;
    X.beginPath(); X.arc(v.x, v.y, 5.4 + Math.sin(v.age * .12) * .8, 0, Math.PI * 2); X.fill();
    // Caudinha de sereia.
    X.strokeStyle = s.c2; X.lineWidth = 2; X.lineCap = 'round';
    X.beginPath(); X.moveTo(v.x, v.y + 4);
    X.quadraticCurveTo(v.x - Math.cos(v.a) * 7, v.y + 9, v.x - Math.cos(v.a) * 11, v.y + 7 + Math.sin(v.age * .3) * 2);
    X.stroke();
    X.restore(); X.globalAlpha = 1;
  },
  wat_puddle(v, X) {
    const s = v.spell;
    const fade = Math.min(1, v.age / 8) * Math.min(1, (s.puddleDur - v.age) / 24);
    if (fade <= 0) return;
    X.save(); X.globalAlpha = .42 * fade;
    const g = X.createRadialGradient(v.tx, v.gy, 2, v.tx, v.gy, 46);
    g.addColorStop(0, s.core); g.addColorStop(.6, s.color); g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.beginPath(); X.ellipse(v.tx, v.gy + 1, 46, 5.5, 0, 0, Math.PI * 2); X.fill();
    X.globalAlpha = .5 * fade;
    X.strokeStyle = '#ffffff'; X.lineWidth = .8;
    X.beginPath(); X.ellipse(v.tx, v.gy, 30 + Math.sin(v.age * .1) * 4, 3.4, 0, 0, Math.PI * 2); X.stroke();
    X.restore(); X.globalAlpha = 1;
  },
};
