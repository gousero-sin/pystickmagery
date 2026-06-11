// earth.js — Earth School: tectonic weight, stone, sand and crystal.
// Herda Earth Spike / Earthquake / Petrify da nature.js (handlers ficam lá;
// o registry funde os mapas globalmente) e adiciona 7 spells próprios.
import { state, H } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode, isEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { EARTH_SPELL_DEFS } from './nature.js?v=8';
import { surfaceYAt } from './fx-helpers.js?v=1';

const GROUND_Y = H - 20;

// ── Visual helpers ─────────────────────────────────────────────────────────
function glow(X, x, y, r, c1, c2, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, 'transparent');
  X.fillStyle = g; X.globalAlpha = alpha;
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fill();
  X.restore(); X.globalAlpha = 1;
}

function rockPoly(X, cx, cy, r, seed, fillA, fillB, edge) {
  const g = X.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r * 1.15);
  g.addColorStop(0, fillA); g.addColorStop(1, fillB);
  X.fillStyle = g;
  X.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = r * (0.74 + Math.sin(a * 3 + seed) * 0.22);
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    i === 0 ? X.moveTo(px, py) : X.lineTo(px, py);
  }
  X.closePath(); X.fill();
  if (edge) { X.strokeStyle = edge; X.lineWidth = 1; X.stroke(); }
}

function spikeShape(X, x, baseY, w, h, lean, fillA, fillB, growth) {
  const hh = h * growth;
  const g = X.createLinearGradient(x, baseY, x + lean * .4, baseY - hh);
  g.addColorStop(0, fillB); g.addColorStop(.55, fillA); g.addColorStop(1, '#f4e6bb');
  X.fillStyle = g;
  X.beginPath();
  X.moveTo(x - w / 2, baseY);
  X.lineTo(x - w * .14 + lean * .3, baseY - hh * .62);
  X.lineTo(x + lean, baseY - hh);
  X.lineTo(x + w * .2 + lean * .3, baseY - hh * .55);
  X.lineTo(x + w / 2, baseY);
  X.closePath(); X.fill();
  X.strokeStyle = 'rgba(40,26,10,.55)'; X.lineWidth = 1; X.stroke();
  // Facetas internas.
  X.strokeStyle = 'rgba(255,240,200,.28)'; X.lineWidth = .8;
  X.beginPath(); X.moveTo(x - w * .1, baseY); X.lineTo(x + lean * .7, baseY - hh * .82); X.stroke();
}

function dustPuff(x, y, n, spread = 2.2, col = '#b89a64') {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 4,
      vx: (Math.random() - .5) * spread, vy: -Math.random() * 1.6 - .2,
      life: 26 + Math.random() * 18 | 0, ml: 44,
      color: Math.random() > .5 ? col : '#8a6f44', size: 1.6 + Math.random() * 2.2,
      grav: -.012, type: 'smoke',
    });
  }
}

function rockChips(x, y, n, force = 4, col = '#caa86a') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI - Math.PI;
    state.particles.push({
      x, y, vx: Math.cos(a) * force * (0.4 + Math.random() * .8),
      vy: Math.sin(a) * force * (0.5 + Math.random() * .7) - 1.4,
      life: 30 + Math.random() * 20 | 0, ml: 50,
      color: Math.random() > .4 ? col : '#7a5c34', size: 1.4 + Math.random() * 1.8,
      grav: .22, type: 'burst',
    });
  }
}

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
  ...EARTH_SPELL_DEFS,
  { name: 'Boulder Toss', icon: '🪨', key: '4', color: '#9c7a44', c2: '#c5a468', core: '#efe0b4', speed: 8.4, dmg: 34, mana: 16, cd: 460, r: 8, grav: .22, drag: .999, bounce: 1, exR: 52, exF: 10, trail: 'boulder', desc: 'Pedregulho pesado em arco — esmaga e ricocheteia uma vez' },
  { name: 'Obsidian Shrapnel', icon: '🗡️', key: '5', color: '#2a2433', c2: '#5d5470', core: '#cfc6ff', speed: 17, dmg: 13, mana: 14, cd: 320, r: 4, grav: .015, drag: 1, bounce: 0, exR: 16, exF: 3, trail: 'obsidian', piercing: true, isObsidianFan: true, fanCount: 5, fanSpread: 0.34, desc: 'Leque de lascas vulcânicas perfurantes com brilho violeta' },
  { name: 'Fissure', icon: '⚒️', key: '6', color: '#8a6a38', c2: '#c79f58', core: '#ffe9ad', speed: 0, dmg: 26, mana: 24, cd: 820, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isFissure: true, fissureRange: 300, fissureSpeed: 5.2, desc: 'Rachadura que corre pelo chão e irrompe em dentes de pedra' },
  { name: 'Crystal Spires', icon: '💎', key: '7', color: '#c9a23e', c2: '#ecd27a', core: '#fff6cf', speed: 0, dmg: 30, mana: 26, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isCrystalSpires: true, spireCount: 3, spireR: 90, desc: 'Três agulhas de cristal âmbar irrompem em sequência' },
  { name: 'Stone Bulwark', icon: '🧱', key: '8', color: '#7d6a4c', c2: '#a8916a', core: '#e0cda0', speed: 0, dmg: 18, mana: 22, cd: 950, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isBulwark: true, bulwarkDur: 320, desc: 'Lajes de pedra erguem-se à frente, lançando inimigos' },
  { name: 'Sandstorm', icon: '🏜️', key: '9', color: '#c8a050', c2: '#e2c684', core: '#f7ecc2', speed: 0, dmg: 4, mana: 32, cd: 1300, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isSandstorm: true, stormDur: 300, stormW: 240, stormH: 120, desc: 'Muralha de areia que empurra, cega e desgasta' },
  { name: "Mountain's Wrath", icon: '🏔️', key: '0', color: '#6e5430', c2: '#b08a4c', core: '#ffe9ad', speed: 0, dmg: 55, mana: 80, cd: 7000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isMountainsWrath: true, wrathSpikes: 9, desc: 'A cordilheira inteira responde — erupção sequencial de pedra (Ultimate)' },
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  isObsidianFan: (s, ox, oy, tx, ty) => {
    const base = Math.atan2(ty - oy, tx - ox);
    for (let i = 0; i < s.fanCount; i++) {
      const a = base + (i - (s.fanCount - 1) / 2) * s.fanSpread;
      state.projectiles.push(createPlayerProjectile({
        x: ox, y: oy, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        spell: s, life: 130, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
      }));
    }
    SoundFX.playSweep(900, 280, 'sawtooth', 0.18, 0.16);
    spawnP(ox, oy, s.core, 6, 'sparkle');
    return true;
  },
  isFissure: (s, ox, oy, tx, ty) => {
    const dir = tx >= ox ? 1 : -1;
    const gy = surfaceYAt(tx, ty);
    state.vfxSequences.push({
      type: 'earth_fissure', state: 0, age: 0, spell: s,
      x: tx - dir * Math.min(80, Math.abs(tx - ox)), dir, gy, traveled: 0, teeth: [], hitSet: new Set(),
    });
    state.shake(3);
    SoundFX.playNoise(0.5, 0.4, 180, 'lowpass');
    dustPuff(tx, gy, 8);
    return true;
  },
  isCrystalSpires: (s, ox, oy, tx, ty) => {
    const spires = [];
    for (let i = 0; i < s.spireCount; i++) {
      spires.push({
        x: tx + (i - (s.spireCount - 1) / 2) * (s.spireR / s.spireCount * 2) + (Math.random() - .5) * 14,
        gy: 0, delay: i * 14, h: 64 + Math.random() * 30, w: 16 + Math.random() * 8,
        lean: (Math.random() - .5) * 14, hit: false, seed: Math.random() * 9,
      });
    }
    for (const sp of spires) sp.gy = surfaceYAt(sp.x, ty);
    state.vfxSequences.push({ type: 'earth_spires', state: 0, age: 0, spell: s, spires });
    SoundFX.playSweep(180, 720, 'triangle', 0.3, 0.3);
    return true;
  },
  isBulwark: (s, ox, oy) => {
    const f = state.player.facing || 1;
    const slabs = [];
    for (let i = 0; i < 3; i++) {
      const sx = ox + f * (26 + i * 18);
      slabs.push({ x: sx, gy: surfaceYAt(sx, oy), h: 52 - i * 9, w: 15, delay: i * 7, seed: Math.random() * 9 });
    }
    state.vfxSequences.push({ type: 'earth_bulwark', state: 0, age: 0, spell: s, slabs, dir: f });
    state.shake(4);
    SoundFX.playNoise(0.55, 0.45, 150, 'lowpass');
    return true;
  },
  isSandstorm: (s, ox, oy, tx) => {
    const dir = tx >= ox ? 1 : -1;
    state.vfxSequences.push({
      type: 'earth_sandstorm', state: 0, age: 0, spell: s,
      cx: tx, gy: surfaceYAt(tx, ty), dir, grains: Array.from({ length: 46 }, () => ({
        ox: Math.random(), oy: Math.random(), sp: .6 + Math.random() * 1.6, sz: 1 + Math.random() * 2.4, ph: Math.random() * 9,
      })),
    });
    SoundFX.playNoise(1.2, 0.35, 900, 'bandpass');
    return true;
  },
  isMountainsWrath: (s) => {
    const px = state.player.x + state.player.w / 2;
    const spikes = [];
    for (let i = 0; i < s.wrathSpikes; i++) {
      const off = (i + 1) * 78;
      spikes.push({ x: px + off, delay: i * 9, h: 90 + Math.random() * 60, w: 30 + Math.random() * 16, lean: (Math.random() - .5) * 20, hit: false, seed: Math.random() * 9 });
      spikes.push({ x: px - off, delay: i * 9 + 4, h: 90 + Math.random() * 60, w: 30 + Math.random() * 16, lean: (Math.random() - .5) * 20, hit: false, seed: Math.random() * 9 });
    }
    const feetY = state.player.y + state.player.h;
    for (const sp of spikes) sp.gy = surfaceYAt(sp.x, feetY);
    state.vfxSequences.push({ type: 'earth_wrath', state: 0, age: 0, spell: s, spikes, px });
    state.shake(8);
    SoundFX.playNoise(1.4, 0.6, 120, 'lowpass');
    SoundFX.playSweep(90, 40, 'sine', 1.2, 0.5);
    return true;
  },
};

// ── Trail emitters / projectile bodies ─────────────────────────────────────
export const TRAIL_EMITTERS = {
  boulder(p, s) {
    if (Math.random() < .5) dustPuff(p.x, p.y, 1, 1.4);
    if (Math.random() < .25) {
      state.particles.push({
        x: p.x, y: p.y, vx: (Math.random() - .5) * 1.4, vy: -Math.random(),
        life: 18, ml: 18, color: '#caa86a', size: 1.4, grav: .18, type: 'burst',
      });
    }
  },
  obsidian(p, s) {
    state.particles.push({
      x: p.x, y: p.y, vx: -p.vx * .06, vy: -p.vy * .06,
      life: 12, ml: 12, color: Math.random() > .5 ? '#9c8fd4' : '#3a3346',
      size: 1.2 + Math.random(), grav: 0, type: 'sparkle',
    });
  },
};

export const PROJ_DRAW = {
  boulder(p, s, X) {
    const r = s.r;
    X.save(); X.translate(p.x, p.y); X.rotate((p.age || 0) * 0.12 * Math.sign(p.vx || 1));
    glow(X, 0, 0, r * 2.6, 'rgba(239,224,180,.5)', 'rgba(156,122,68,.25)', .5);
    rockPoly(X, 0, 0, r * 1.25, 2.4, '#c5a468', '#6b5026', 'rgba(35,24,8,.7)');
    X.strokeStyle = 'rgba(35,24,8,.5)'; X.lineWidth = .8;
    X.beginPath(); X.moveTo(-r * .5, -r * .3); X.lineTo(r * .2, r * .4); X.stroke();
    X.restore();
  },
  obsidian(p, s, X) {
    X.save(); X.translate(p.x, p.y); X.rotate(Math.atan2(p.vy, p.vx));
    glow(X, 0, 0, 12, 'rgba(207,198,255,.55)', 'rgba(93,84,112,.3)', .6);
    const g = X.createLinearGradient(-9, 0, 9, 0);
    g.addColorStop(0, '#15111f'); g.addColorStop(.6, '#4a4060'); g.addColorStop(1, '#cfc6ff');
    X.fillStyle = g;
    X.beginPath(); X.moveTo(9, 0); X.lineTo(-7, -3); X.lineTo(-4, 0); X.lineTo(-7, 3); X.closePath(); X.fill();
    X.strokeStyle = 'rgba(207,198,255,.7)'; X.lineWidth = .7;
    X.beginPath(); X.moveTo(7, 0); X.lineTo(-5, -1.6); X.stroke();
    X.restore();
  },
};

// ── VFX update ─────────────────────────────────────────────────────────────
export const VFX_UPDATE = {
  earth_fissure(v) {
    const s = v.spell;
    if (v.state === 0) {
      const step = s.fissureSpeed;
      v.x += v.dir * step; v.traveled += step;
      if (v.age % 2 === 0) dustPuff(v.x, v.gy, 2, 1.8);
      if (v.age % 3 === 0) rockChips(v.x, v.gy, 2, 2.4);
      if (v.age % 4 === 0) v.teeth.push({ x: v.x, h: 10 + Math.random() * 12, w: 8 + Math.random() * 5, born: v.age, seed: Math.random() * 9 });
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.x) < 22 && e.y + e.h > v.gy - 30) {
          v.hitSet.add(e);
          hurtEntity(e, s.dmg, v.x, v.gy);
          e.vy = -7.5; e.vx += v.dir * 2.5;
          rockChips(e.x + e.w / 2, e.y + e.h, 6, 4);
          state.shake(2.5);
          SoundFX.playNoise(0.2, 0.35, 300, 'lowpass');
        }
      }
      if (v.traveled >= s.fissureRange) { v.state = 1; v.age = 0; }
    } else {
      // Erupção final: dentes crescem e racham.
      if (v.age === 1) {
        state.shake(5);
        explode(v.x, v.gy - 10, 60, 8, s.dmg, s.color, s.c2);
        rockChips(v.x, v.gy, 16, 6);
        state.dynamicLights.push({ x: v.x, y: v.gy - 20, r: 90, color: s.core, int: 1.6, life: 14, ml: 14 });
      }
      if (v.age > 70) v.done = true;
    }
  },
  earth_spires(v) {
    const s = v.spell;
    for (const sp of v.spires) {
      const t = v.age - sp.delay;
      if (t === 1) {
        dustPuff(sp.x, sp.gy, 6); rockChips(sp.x, sp.gy, 5, 3.5);
        state.shake(3);
        SoundFX.playSweep(140, 560, 'triangle', 0.22, 0.2);
      }
      if (t > 0 && t < 12 && !sp.hit) {
        for (const e of state.entities) {
          if (!isEnemyEntity(e)) continue;
          if (Math.abs(e.x + e.w / 2 - sp.x) < sp.w && e.y + e.h > sp.gy - sp.h && e.y + e.h < sp.gy + 14) {
            sp.hit = true;
            hurtEntity(e, s.dmg, sp.x, sp.gy);
            e.vy = -9;
            spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 8, 'sparkle');
          }
        }
      }
    }
    if (v.age > 130) v.done = true;
  },
  earth_bulwark(v) {
    const s = v.spell;
    for (const sl of v.slabs) {
      const t = v.age - sl.delay;
      if (t === 1) { dustPuff(sl.x, sl.gy, 5); state.shake(2); }
      if (t > 0 && t < 10) {
        for (const e of state.entities) {
          if (!isEnemyEntity(e)) continue;
          if (Math.abs(e.x + e.w / 2 - sl.x) < sl.w + 6 && e.y + e.h > sl.gy - sl.h - 8) {
            hurtEntity(e, s.dmg, sl.x, sl.gy);
            e.vx += v.dir * 5; e.vy = -5;
          }
        }
      }
    }
    if (v.age === s.bulwarkDur - 24) { for (const sl of v.slabs) { dustPuff(sl.x, sl.gy - sl.h / 2, 4); } }
    if (v.age > s.bulwarkDur) {
      for (const sl of v.slabs) rockChips(sl.x, sl.gy - sl.h / 2, 8, 4);
      v.done = true;
    }
  },
  earth_sandstorm(v) {
    const s = v.spell;
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      const dx = e.x + e.w / 2 - v.cx;
      if (Math.abs(dx) < s.stormW / 2 && e.y + e.h > v.gy - s.stormH && e.y + e.h < v.gy + 16) {
        e.vx += v.dir * 0.32;
        if (v.age % 18 === 0) hurtEntity(e, s.dmg, e.x, e.y);
      }
    }
    if (v.age % 5 === 0) dustPuff(v.cx + (Math.random() - .5) * s.stormW, v.gy - Math.random() * s.stormH * .5, 1, 3, '#d8b870');
    if (v.age > s.stormDur) v.done = true;
  },
  earth_wrath(v) {
    const s = v.spell;
    if (v.age < 30) {
      // Prelúdio: tremor crescente, poeira por toda a base.
      if (v.age % 3 === 0) {
        dustPuff(v.px + (Math.random() - .5) * 700, GROUND_Y, 2, 2.4);
        state.shake(1 + v.age * .12);
      }
      return;
    }
    for (const sp of v.spikes) {
      const t = v.age - 30 - sp.delay;
      if (t === 1) {
        dustPuff(sp.x, sp.gy, 8); rockChips(sp.x, sp.gy, 8, 5);
        state.shake(4.5);
        SoundFX.playNoise(0.3, 0.5, 160, 'lowpass');
        state.dynamicLights.push({ x: sp.x, y: sp.gy - sp.h * .6, r: 90, color: s.core, int: 1.4, life: 12, ml: 12 });
      }
      if (t > 0 && t < 14 && !sp.hit) {
        for (const e of state.entities) {
          if (!isEnemyEntity(e)) continue;
          if (Math.abs(e.x + e.w / 2 - sp.x) < sp.w && e.y + e.h > sp.gy - sp.h && e.y + e.h < sp.gy + 14) {
            sp.hit = true;
            hurtEntity(e, s.dmg, sp.x, sp.gy);
            e.vy = -11;
            spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 10, 'explode');
          }
        }
      }
    }
    if (v.age === 110) {
      state.shockwaves.push({ x: v.px, y: GROUND_Y - 10, r: 0, maxR: 320, life: 30, maxLife: 30, color: s.c2 });
    }
    if (v.age > 200) v.done = true;
  },
};

// ── VFX draw ───────────────────────────────────────────────────────────────
function drawSpikeSet(X, spikes, ageBase, s, retractAfter = 90) {
  for (const sp of spikes) {
    const t = ageBase - sp.delay;
    if (t <= 0) {
      // Aviso no chão antes da erupção.
      glow(X, sp.x, (sp.gy ?? GROUND_Y), 26, `rgba(255,233,173,${.3 + Math.sin(ageBase * .5) * .15})`, 'rgba(176,138,76,.12)', .8);
      continue;
    }
    const growth = Math.min(1, t / 9);
    const retract = t > retractAfter ? Math.max(0, 1 - (t - retractAfter) / 26) : 1;
    spikeShape(X, sp.x, (sp.gy ?? GROUND_Y) + 2, sp.w, sp.h * retract, sp.lean, s.c2, s.color, growth);
    if (t < 16) glow(X, sp.x, (sp.gy ?? GROUND_Y) - sp.h * growth * .7, 34, 'rgba(255,246,207,.5)', 'rgba(201,162,62,.2)', (16 - t) / 16);
  }
}

export const VFX_DRAW = {
  earth_fissure(v, X) {
    const s = v.spell;
    // Rastro da rachadura com brilho interno.
    X.save();
    for (const th of v.teeth) {
      const tAge = v.age - th.born + (v.state === 1 ? 40 : 0);
      const fade = v.state === 1 ? Math.max(0, 1 - v.age / 70) : 1;
      spikeShape(X, th.x, v.gy + 2, th.w, th.h * (v.state === 1 ? 1.8 : 1), 0, s.c2, s.color, Math.min(1, tAge / 6) * fade);
    }
    if (v.state === 0) {
      glow(X, v.x, v.gy, 30, 'rgba(255,233,173,.7)', 'rgba(138,106,56,.3)', .9);
      X.strokeStyle = s.core; X.lineWidth = 2; X.globalAlpha = .8;
      X.beginPath(); X.moveTo(v.x - v.dir * v.traveled, v.gy + 4);
      for (let d = 0; d < v.traveled; d += 14) {
        X.lineTo(v.x - v.dir * (v.traveled - d), v.gy + 4 + Math.sin(d * .4) * 2.2);
      }
      X.stroke(); X.globalAlpha = 1;
    } else {
      glow(X, v.x, v.gy - 20, 70 * Math.max(0, 1 - v.age / 70), 'rgba(255,233,173,.8)', 'rgba(199,159,88,.3)', .9);
    }
    X.restore();
  },
  earth_spires(v, X) { drawSpikeSet(X, v.spires, v.age, v.spell, 92); },
  earth_bulwark(v, X) {
    const s = v.spell;
    for (const sl of v.slabs) {
      const t = v.age - sl.delay;
      if (t <= 0) continue;
      const growth = Math.min(1, t / 8);
      const fade = v.age > s.bulwarkDur - 24 ? Math.max(0, (s.bulwarkDur - v.age) / 24) : 1;
      const hh = sl.h * growth * fade;
      X.save();
      X.translate(sl.x, sl.gy);
      const g = X.createLinearGradient(0, 0, 0, -hh);
      g.addColorStop(0, '#4d3d24'); g.addColorStop(.5, s.color); g.addColorStop(1, s.c2);
      X.fillStyle = g;
      X.beginPath();
      X.moveTo(-sl.w / 2, 2); X.lineTo(-sl.w / 2 + 2, -hh + 4); X.lineTo(0, -hh);
      X.lineTo(sl.w / 2 - 1, -hh + 6); X.lineTo(sl.w / 2, 2); X.closePath(); X.fill();
      X.strokeStyle = 'rgba(35,24,8,.6)'; X.lineWidth = 1; X.stroke();
      X.strokeStyle = 'rgba(224,205,160,.4)'; X.lineWidth = .7;
      X.beginPath(); X.moveTo(-sl.w * .2, 0); X.lineTo(-sl.w * .1, -hh * .8); X.stroke();
      X.restore();
      if (t < 12) glow(X, sl.x, sl.gy - hh, 26, 'rgba(224,205,160,.5)', 'transparent', (12 - t) / 12);
    }
  },
  earth_sandstorm(v, X) {
    const s = v.spell;
    const fade = Math.min(1, v.age / 20) * Math.min(1, (s.stormDur - v.age) / 30);
    if (fade <= 0) return;
    X.save();
    X.globalAlpha = .26 * fade;
    const g = X.createLinearGradient(v.cx - s.stormW / 2, 0, v.cx + s.stormW / 2, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(.3, s.color); g.addColorStop(.7, s.c2); g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.fillRect(v.cx - s.stormW / 2, v.gy - s.stormH, s.stormW, s.stormH);
    // Faixas de vento de areia.
    X.globalAlpha = .5 * fade;
    X.strokeStyle = s.core; X.lineWidth = 1.2; X.lineCap = 'round';
    for (const gr of v.grains) {
      const gx = v.cx - s.stormW / 2 + ((gr.ox + v.age * .013 * gr.sp * v.dir + 10) % 1) * s.stormW;
      const gy = v.gy - gr.oy * s.stormH + Math.sin(v.age * .12 + gr.ph) * 6;
      X.globalAlpha = (.25 + gr.sz * .12) * fade;
      X.beginPath(); X.moveTo(gx, gy); X.lineTo(gx + v.dir * (5 + gr.sp * 5), gy - 1); X.stroke();
    }
    X.restore(); X.globalAlpha = 1;
  },
  earth_wrath(v, X) {
    const s = v.spell;
    if (v.age < 30) {
      // Prelúdio: chão racha em luz.
      X.save();
      X.globalAlpha = (v.age / 30) * .55;
      const g = X.createLinearGradient(0, GROUND_Y - 6, 0, GROUND_Y + 8);
      g.addColorStop(0, 'transparent'); g.addColorStop(.6, s.core); g.addColorStop(1, 'transparent');
      X.fillStyle = g;
      X.fillRect(v.px - 380, GROUND_Y - 6, 760, 14);
      X.restore(); X.globalAlpha = 1;
      return;
    }
    drawSpikeSet(X, v.spikes, v.age - 30, s, 120);
  },
};

export const PROJ_HOOKS = {
  boulder: {
    onLand(p, s) {
      state.shake(4);
      dustPuff(p.x, p.y, 10, 3);
      rockChips(p.x, p.y, 12, 5.5);
      state.dynamicLights.push({ x: p.x, y: p.y, r: 70, color: s.core, int: 1.4, life: 12, ml: 12 });
      SoundFX.playNoise(0.4, 0.5, 200, 'lowpass');
      return false; // deixa a explosão padrão (exR) acontecer também
    },
  },
};
