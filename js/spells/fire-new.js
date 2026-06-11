// fire-new.js — 5 spells novos do revamp da escola Fire.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { surfaceYAt, glowFX, puffFX } from './fx-helpers.js?v=1';

export const DEFS = [
  { name: 'Ember Serpent', icon: '🐍', key: 'E', color: '#ff5a18', c2: '#ff9b35', core: '#ffe69a', speed: 9, dmg: 24, mana: 18, cd: 520, r: 5, grav: 0, drag: 1, bounce: 0, exR: 30, exF: 5, trail: 'serpent', isEmberSerpent: true, desc: 'Serpente de chama serpenteia até o alvo deixando brasas' },
  { name: 'Solar Lash', icon: '☀️', key: 'I', color: '#ff7a1f', c2: '#ffb14a', core: '#fff0b6', speed: 0, dmg: 26, mana: 16, cd: 460, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isSolarLash: true, lashR: 68, desc: 'Chicote solar varre um arco incandescente à frente' },
  { name: 'Ashen Geyser', icon: '🌋', key: 'U', color: '#d8451a', c2: '#ff8a2e', core: '#ffd98a', speed: 0, dmg: 16, mana: 26, cd: 850, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isAshGeyser: true, geyPulses: 3, geyR: 44, desc: 'Fenda vulcânica pulsa três erupções de lava e cinza' },
  { name: 'Cinder Swarm', icon: '🔥', key: 'G', color: '#ff6a22', c2: '#ffaa55', core: '#ffe6a3', speed: 4.2, dmg: 7, mana: 20, cd: 700, r: 3, grav: 0, drag: 1, bounce: 0, exR: 14, exF: 2, trail: 'cinder', isCinderSwarm: true, swarmCount: 6, desc: 'Enxame de brasas vivas caça os inimigos próximos' },
  { name: 'Flare Mine', icon: '💥', key: 'H', color: '#ff4412', c2: '#ff9b35', core: '#fff2a6', speed: 0, dmg: 45, mana: 24, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isFlareMine: true, mineArm: 26, mineR: 42, desc: 'Mina ígnea armada no chão — pilar de fogo ao gatilho' },
];

export const FIRE_HANDLERS = {
  isEmberSerpent: (s, ox, oy, tx, ty) => {
    const a = Math.atan2(ty - oy, tx - ox);
    state.projectiles.push(createPlayerProjectile({
      x: ox, y: oy, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
      spell: s, life: 160, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
      serpentSeg: [],
    }));
    SoundFX.playSweep(300, 700, 'sawtooth', 0.3, 0.2);
    return true;
  },
  isSolarLash: (s, ox, oy, tx, ty) => {
    const dir = tx >= ox ? 1 : -1;
    state.vfxSequences.push({ type: 'fir_lash', state: 0, age: 0, spell: s, ox, oy, dir, hitSet: new Set() });
    SoundFX.playSweep(500, 160, 'sawtooth', 0.22, 0.2);
    return true;
  },
  isAshGeyser: (s, ox, oy, tx, ty) => {
    const gy = surfaceYAt(tx, ty);
    state.vfxSequences.push({ type: 'fir_geyser', state: 0, age: 0, spell: s, tx, gy, pulse: 0 });
    puffFX(tx, gy, 5, '#664433');
    SoundFX.playNoise(0.5, 0.4, 240, 'lowpass');
    return true;
  },
  isCinderSwarm: (s, ox, oy, tx, ty) => {
    for (let i = 0; i < s.swarmCount; i++) {
      const a = Math.atan2(ty - oy, tx - ox) + (i - (s.swarmCount - 1) / 2) * 0.42;
      state.projectiles.push(createPlayerProjectile({
        x: ox, y: oy, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        spell: s, life: 180, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
        cinderPhase: Math.random() * 9,
      }));
    }
    SoundFX.playNoise(0.3, 0.25, 1200, 'bandpass');
    return true;
  },
  isFlareMine: (s, ox, oy, tx, ty) => {
    const gy = surfaceYAt(tx, ty);
    state.vfxSequences.push({ type: 'fir_mine', state: 0, age: 0, spell: s, tx, gy, armed: false, fired: false });
    SoundFX.playTone(420, 'square', 0.1, 0.14);
    return true;
  },
};

export const TRAIL_EMITTERS = {
  serpent(p) {
    // Guarda segmentos da serpente para o corpo desenhado.
    p.serpentSeg = p.serpentSeg || [];
    p.serpentSeg.unshift({ x: p.x, y: p.y });
    if (p.serpentSeg.length > 12) p.serpentSeg.pop();
    if (Math.random() < .5) {
      state.particles.push({
        x: p.x, y: p.y, vx: (Math.random() - .5) * .8, vy: -Math.random() * .8,
        life: 16, ml: 16, color: Math.random() > .5 ? '#ffe69a' : '#ff9b35', size: 1.4, grav: -.02, type: 'ember',
      });
    }
  },
  cinder(p) {
    state.particles.push({
      x: p.x, y: p.y, vx: 0, vy: -.3,
      life: 12, ml: 12, color: '#ffaa55', size: 1 + Math.random(), grav: -.01, type: 'ember',
    });
  },
};

export const PROJ_DRAW = {
  serpent(p, s, X) {
    const segs = p.serpentSeg || [];
    glowFX(X, p.x, p.y, 18, 'rgba(255,230,154,.6)', 'rgba(255,90,24,.3)', .8);
    X.save();
    X.lineCap = 'round';
    for (let i = segs.length - 1; i >= 0; i--) {
      const t = 1 - i / Math.max(1, segs.length);
      X.globalAlpha = .25 + t * .7;
      X.strokeStyle = i < 3 ? s.core : i < 7 ? s.c2 : s.color;
      X.lineWidth = 1.6 + t * 4.4;
      if (i < segs.length - 1) {
        X.beginPath(); X.moveTo(segs[i + 1].x, segs[i + 1].y); X.lineTo(segs[i].x, segs[i].y); X.stroke();
      }
    }
    // Cabeça.
    X.globalAlpha = 1;
    const a = Math.atan2(p.vy, p.vx);
    X.translate(p.x, p.y); X.rotate(a);
    const g = X.createRadialGradient(0, 0, 1, 0, 0, 7);
    g.addColorStop(0, '#fff'); g.addColorStop(.5, s.core); g.addColorStop(1, s.color);
    X.fillStyle = g;
    X.beginPath(); X.moveTo(7, 0); X.lineTo(-3, -4); X.lineTo(-1, 0); X.lineTo(-3, 4); X.closePath(); X.fill();
    X.fillStyle = '#3a1505';
    X.beginPath(); X.arc(2.4, -1.4, .9, 0, Math.PI * 2); X.fill();
    X.restore();
  },
  cinder(p, s, X) {
    const t = performance.now() * .02 + (p.cinderPhase || 0);
    glowFX(X, p.x, p.y, 11, 'rgba(255,230,163,.8)', 'rgba(255,106,34,.4)', .85);
    X.save(); X.fillStyle = s.core;
    X.beginPath(); X.arc(p.x, p.y, 2 + Math.sin(t) * .5, 0, Math.PI * 2); X.fill();
    X.restore();
  },
};

export const PROJ_HOOKS = {
  serpent: {
    onUpdate(p, s) {
      // Serpenteia e corrige levemente rumo ao inimigo mais próximo.
      const e = nearestEnemyEntity(p.x, p.y, 220);
      if (e) {
        const a = Math.atan2(e.y + e.h / 2 - p.y, e.x + e.w / 2 - p.x);
        p.vx += Math.cos(a) * .2; p.vy += Math.sin(a) * .2;
      }
      const a0 = Math.atan2(p.vy, p.vx);
      const sway = Math.sin(p.age * .35) * 1.6;
      p.vx += Math.cos(a0 + Math.PI / 2) * sway * .14;
      p.vy += Math.sin(a0 + Math.PI / 2) * sway * .14;
      const sp = Math.hypot(p.vx, p.vy), max = 9.6;
      if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      return false;
    },
  },
  cinder: {
    onUpdate(p, s) {
      const e = nearestEnemyEntity(p.x, p.y, 240);
      if (e) {
        const a = Math.atan2(e.y + e.h / 2 - p.y, e.x + e.w / 2 - p.x);
        p.vx += Math.cos(a) * .3; p.vy += Math.sin(a) * .3;
        const sp = Math.hypot(p.vx, p.vy), max = 5.2;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
      }
      p.vy += Math.sin((p.age + (p.cinderPhase || 0) * 10) * .3) * .1;
      return false;
    },
  },
};

export const VFX_UPDATE = {
  fir_lash(v) {
    const s = v.spell;
    const t = v.age / 15;
    if (t <= 1) {
      const reach = s.lashR * Math.sin(t * Math.PI);
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        const dx = (e.x + e.w / 2 - v.ox) * v.dir, dy = Math.abs(e.y + e.h / 2 - v.oy);
        if (dx > 0 && dx < reach + 14 && dy < 42) {
          v.hitSet.add(e);
          hurtEntity(e, s.dmg, v.ox, v.oy);
          e.vx += v.dir * 3.6; e.vy -= 2;
          spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 8, 'explode');
          state.dynamicLights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 50, color: s.c2, int: 1.4, life: 10, ml: 10 });
        }
      }
      if (v.age % 2 === 0) {
        const sweep = -0.9 + t * 1.8;
        const px = v.ox + v.dir * Math.cos(sweep) * reach, py = v.oy + Math.sin(sweep) * reach * .7;
        state.particles.push({ x: px, y: py, vx: v.dir * 1.2, vy: -1, life: 18, ml: 18, color: '#ffe69a', size: 1.8, grav: -.02, type: 'ember' });
      }
    }
    if (v.age > 22) v.done = true;
  },
  fir_geyser(v) {
    const s = v.spell;
    const period = 22;
    const local = v.age % period;
    if (v.pulse < s.geyPulses && local === 8) {
      v.pulse++;
      state.shake(3);
      explode(v.tx, v.gy - 14, s.geyR, 6, s.dmg, s.color, s.c2);
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: v.tx + (Math.random() - .5) * 16, y: v.gy - 4,
          vx: (Math.random() - .5) * 2.4, vy: -4 - Math.random() * 3,
          life: 30, ml: 30, color: Math.random() > .4 ? '#ff8a2e' : '#ffd98a', size: 2 + Math.random() * 2, grav: .14, type: 'ember',
        });
      }
      state.dynamicLights.push({ x: v.tx, y: v.gy - 24, r: 80, color: s.c2, int: 1.8, life: 12, ml: 12 });
      SoundFX.playNoise(0.3, 0.45, 300, 'lowpass');
    }
    if (v.age > period * s.geyPulses + 12) v.done = true;
  },
  fir_mine(v) {
    const s = v.spell;
    if (!v.armed && v.age >= s.mineArm) {
      v.armed = true;
      SoundFX.playTone(880, 'square', 0.07, 0.12);
      spawnP(v.tx, v.gy - 4, s.core, 4, 'sparkle');
    }
    if (v.armed && !v.fired) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.tx) < s.mineR && Math.abs(e.y + e.h - v.gy) < 46) {
          v.fired = true; v.fireAge = v.age;
          state.shake(5);
          explode(v.tx, v.gy - 20, s.mineR + 18, 10, s.dmg, s.color, s.c2);
          for (let i = 0; i < 14; i++) {
            state.particles.push({
              x: v.tx + (Math.random() - .5) * 12, y: v.gy - 6,
              vx: (Math.random() - .5) * 3, vy: -5 - Math.random() * 4,
              life: 34, ml: 34, color: Math.random() > .4 ? s.c2 : s.core, size: 2 + Math.random() * 2.4, grav: .16, type: 'ember',
            });
          }
          state.dynamicLights.push({ x: v.tx, y: v.gy - 40, r: 120, color: s.c2, int: 2.2, life: 16, ml: 16 });
          SoundFX.playNoise(0.5, 0.6, 200, 'lowpass');
          break;
        }
      }
      // Expira sozinha após ~9s.
      if (v.age > 560) v.done = true;
    }
    if (v.fired && v.age > v.fireAge + 26) v.done = true;
  },
};

export const VFX_DRAW = {
  fir_lash(v, X) {
    const s = v.spell;
    const t = Math.min(1, v.age / 15);
    const reach = s.lashR * Math.sin(t * Math.PI);
    const sweep = -0.9 + t * 1.8;
    X.save();
    X.translate(v.ox, v.oy);
    X.scale(v.dir, 1);
    X.globalCompositeOperation = 'lighter';
    const ex = Math.cos(sweep) * reach, ey = Math.sin(sweep) * reach * .7;
    for (const [w, col, al] of [[7, s.color, .35], [4, s.c2, .6], [1.8, s.core, .95]]) {
      X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.globalAlpha = al;
      X.beginPath(); X.moveTo(0, 0);
      X.quadraticCurveTo(reach * .45, ey * .2 - 16 * (1 - t), ex, ey);
      X.stroke();
    }
    X.restore(); X.globalAlpha = 1;
    glowFX(X, v.ox + v.dir * Math.cos(sweep) * reach, v.oy + Math.sin(sweep) * reach * .7, 22, 'rgba(255,240,182,.8)', 'rgba(255,122,31,.3)', 1 - t * .5);
  },
  fir_geyser(v, X) {
    const s = v.spell;
    const period = 22, local = v.age % period;
    const active = v.pulse < s.geyPulses || local < 14;
    const fade = Math.min(1, v.age / 8) * (v.age > period * s.geyPulses ? Math.max(0, 1 - (v.age - period * s.geyPulses) / 12) : 1);
    // Fenda incandescente.
    X.save();
    X.globalAlpha = .8 * fade;
    const g = X.createLinearGradient(v.tx - 22, v.gy, v.tx + 22, v.gy);
    g.addColorStop(0, 'transparent'); g.addColorStop(.5, s.core); g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.fillRect(v.tx - 22, v.gy - 2, 44, 4);
    X.restore();
    if (active && local >= 6 && local < 16) {
      const pt = (local - 6) / 10;
      const h = 64 * Math.sin(pt * Math.PI);
      X.save();
      X.globalCompositeOperation = 'lighter';
      const lg = X.createLinearGradient(0, v.gy, 0, v.gy - h);
      lg.addColorStop(0, s.color); lg.addColorStop(.5, s.c2); lg.addColorStop(1, 'transparent');
      X.fillStyle = lg;
      X.globalAlpha = .85 * fade;
      X.beginPath();
      X.moveTo(v.tx - 13, v.gy);
      X.quadraticCurveTo(v.tx - 8, v.gy - h * .7, v.tx + Math.sin(v.age * .4) * 3, v.gy - h);
      X.quadraticCurveTo(v.tx + 8, v.gy - h * .7, v.tx + 13, v.gy);
      X.closePath(); X.fill();
      X.restore(); X.globalAlpha = 1;
    }
    glowFX(X, v.tx, v.gy - 6, 34, 'rgba(255,217,138,.5)', 'rgba(216,69,26,.2)', fade * (active ? 1 : .4));
  },
  fir_mine(v, X) {
    const s = v.spell;
    if (v.fired) {
      const ft = (v.age - v.fireAge) / 26;
      if (ft < 1) {
        // Pilar de fogo.
        const h = 90 * Math.sin(Math.min(1, ft * 1.4) * Math.PI * .5);
        X.save();
        X.globalCompositeOperation = 'lighter';
        const g = X.createLinearGradient(0, v.gy, 0, v.gy - h);
        g.addColorStop(0, s.color); g.addColorStop(.4, s.c2); g.addColorStop(1, 'transparent');
        X.fillStyle = g;
        X.globalAlpha = 1 - ft * .7;
        X.fillRect(v.tx - 14, v.gy - h, 28, h);
        X.restore(); X.globalAlpha = 1;
        glowFX(X, v.tx, v.gy - 20, 70 * (1 - ft), 'rgba(255,242,166,.8)', 'rgba(255,68,18,.3)', 1 - ft);
      }
      return;
    }
    // Mina no chão: disco rúnico pulsando.
    const arm = v.armed ? 1 : Math.min(1, v.age / s.mineArm);
    const pulse = v.armed ? .6 + Math.sin(v.age * .25) * .4 : .25;
    X.save();
    X.globalAlpha = .85;
    const g = X.createRadialGradient(v.tx, v.gy - 2, 1, v.tx, v.gy - 2, 10);
    g.addColorStop(0, s.core); g.addColorStop(.7, s.color); g.addColorStop(1, '#5a1505');
    X.fillStyle = g;
    X.beginPath(); X.ellipse(v.tx, v.gy - 2, 9, 4, 0, 0, Math.PI * 2); X.fill();
    X.strokeStyle = s.c2; X.lineWidth = 1; X.globalAlpha = pulse;
    X.beginPath(); X.ellipse(v.tx, v.gy - 2, 13 + Math.sin(v.age * .2) * 2, 6, 0, 0, Math.PI * 2); X.stroke();
    X.restore(); X.globalAlpha = 1;
    glowFX(X, v.tx, v.gy - 3, 18 * arm, 'rgba(255,242,166,.6)', 'transparent', pulse);
  },
};
