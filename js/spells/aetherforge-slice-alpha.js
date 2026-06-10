// aetherforge-slice-alpha.js — Aetherforge School (Alpha Slice)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode, isEnemyEntity } from '../core/utils.js?v=8';

function removeAlphaVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nearestEntity(x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
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

function pushLightningArc(x1, y1, x2, y2, color) {
  state.lightningBolts.push({
    segments: [
      { x: x1, y: y1 },
      {
        x: (x1 + x2) * 0.5 + (Math.random() - 0.5) * 16,
        y: (y1 + y2) * 0.5 + (Math.random() - 0.5) * 16,
      },
      { x: x2, y: y2 },
    ],
    life: 8,
    color,
    width: 1.6,
  });
}

export const ALPHA_SPELL_DEFS = [
  {
    name: 'Helix Rivet',
    icon: '🧲',
    key: '1',
    category: 'Common',
    color: '#58d7ff',
    c2: '#7f92ff',
    core: '#dfffff',
    speed: 9,
    dmg: 18,
    mana: 14,
    cd: 260,
    r: 5,
    grav: 0.01,
    drag: 0.998,
    bounce: 1,
    exR: 0,
    exF: 0,
    trail: 'aether_rivet',
    isAetherRivet: true,
    rivetSpin: 0.32,
    rivetMaxSpeed: 15.5,
    rivetPulseEvery: 8,
    rivetPulseR: 34,
    rivetPulseDmg: 5,
    rivetBloomR: 88,
    rivetBloomDmg: 24,
    desc: 'Gyroscopic rivet that accelerates in flight and detonates in a delayed forge implosion',
  },
  {
    name: 'Forgeheart Eidolon',
    icon: '⚒️',
    key: '2',
    category: 'Summon',
    color: '#ff8b4a',
    c2: '#ffc367',
    core: '#fff3d4',
    speed: 0,
    dmg: 14,
    mana: 32,
    cd: 1450,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'aether',
    isForgeheartEidolon: true,
    summonDur: 420,
    summonR: 170,
    pulseEvery: 30,
    pulsePull: 1.15,
    hammerCount: 3,
    hammerR: 44,
    hammerDmg: 8,
    desc: 'Summon a cinematic forge spirit with orbiting hammers that pull and slam enemies',
  },
];

export const ALPHA_FIRE_HANDLERS = {
  isForgeheartEidolon(s, ox, oy, tx, ty) {
    const cx = clamp(tx, 60, state.W - 60);
    const cy = clamp(ty, 85, state.H - 70);
    const count = Math.max(2, s.hammerCount || 3);
    const hammers = [];
    for (let i = 0; i < count; i++) {
      hammers.push({
        phase: (i / count) * Math.PI * 2 + Math.random() * 0.5,
        x: cx,
        y: cy,
        lastHit: -999,
      });
    }

    state.vfxSequences.push({
      type: 'aetherforge_eidolon',
      state: 0,
      age: 0,
      cx,
      cy,
      vx: 0,
      vy: 0,
      anchorX: cx,
      anchorY: cy,
      spell: s,
      lifeLeft: s.summonDur || 420,
      hammers,
      pulseFx: [],
      seed: Math.random() * Math.PI * 2,
    });

    spawnP(cx, cy, s.c2, 14, 'sparkle');
    spawnP(cx, cy, s.color, 18, 'burst');
    state.dynamicLights.push({ x: cx, y: cy, r: 120, color: s.core, int: 1.8, life: 12, ml: 12 });
    state.shockwaves.push({ x: cx, y: cy, r: 0, maxR: 48, life: 10, maxLife: 10, color: s.c2 });
    SoundFX.playSweep(140, 920, 'triangle', 0.35, 0.25);
    SoundFX.playNoise(0.22, 0.18, 450, 'lowpass');
    return true;
  },
};

export const ALPHA_PROJ_HOOKS = {
  isAetherRivet: {
    onUpdate(p, s) {
      p.rivetSpin = (p.rivetSpin || Math.random() * Math.PI * 2) + (s.rivetSpin || 0.3);

      const spd = Math.hypot(p.vx, p.vy) || 1;
      const maxSpd = s.rivetMaxSpeed || 15;
      if (spd < maxSpd) {
        p.vx *= 1.012;
        p.vy *= 1.012;
      }

      if (p.age % 2 === 0) {
        const armA = p.rivetSpin;
        const armR = 8 + Math.sin(p.age * 0.22) * 3;
        spawnP(
          p.x + Math.cos(armA) * armR,
          p.y + Math.sin(armA) * armR,
          Math.random() > 0.5 ? s.core : s.c2,
          1,
          'sparkle'
        );
        spawnP(
          p.x + Math.cos(armA + Math.PI) * armR,
          p.y + Math.sin(armA + Math.PI) * armR,
          s.color,
          1,
          'trail'
        );
      }

      if (p.age % (s.rivetPulseEvery || 8) === 0) {
        const r = s.rivetPulseR || 34;
        for (const e of state.entities) {
          if (!e.active) continue;
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          const d = Math.hypot(ex - p.x, ey - p.y);
          if (d > r + Math.max(e.w, e.h) * 0.35) continue;
          hurtEntity(e, s.rivetPulseDmg || 5, p.x, p.y);
          const tang = Math.atan2(ey - p.y, ex - p.x) + Math.PI * 0.5;
          const push = 1.8 / (e.mass || 1);
          e.vx += Math.cos(tang) * push;
          e.vy += Math.sin(tang) * push - 0.35;
          spawnP(ex, ey, s.c2, 4, 'burst');
          pushLightningArc(p.x, p.y, ex, ey, s.c2);
        }
      }

      if (p.age % 5 === 0) {
        state.dynamicLights.push({ x: p.x, y: p.y, r: 24, color: s.c2, int: 0.65, life: 4, ml: 4 });
      }
    },

    onLand(p, s) {
      state.vfxSequences.push({
        type: 'aether_rivet_bloom',
        state: 0,
        age: 0,
        cx: p.x,
        cy: p.y,
        spell: s,
        radius: s.rivetBloomR || 88,
        damage: s.rivetBloomDmg || 24,
      });
      spawnP(p.x, p.y, s.c2, 10, 'sparkle');
      SoundFX.playTone(1200, 'sawtooth', 0.08, 0.07);
      SoundFX.playSweep(880, 180, 'triangle', 0.25, 0.2);
    },
  },
};

export const ALPHA_TRAIL_EMITTERS = {
  aether_rivet(p, s) {
    const t = p.rivetSpin || p.age * 0.25;
    const ringR = 6 + Math.sin(p.age * 0.18) * 2;
    spawnP(
      p.x + Math.cos(t) * ringR,
      p.y + Math.sin(t) * ringR,
      Math.random() > 0.5 ? s.core : s.c2,
      1,
      'sparkle'
    );
    if (p.age % 3 === 0) {
      state.particles.push({
        x: p.x + (Math.random() - 0.5) * 4,
        y: p.y + (Math.random() - 0.5) * 4,
        vx: -p.vx * 0.25 + (Math.random() - 0.5) * 1.2,
        vy: -p.vy * 0.25 + (Math.random() - 0.5) * 1.2,
        life: 24,
        ml: 24,
        color: Math.random() > 0.55 ? s.c2 : s.color,
        size: 2 + Math.random() * 1.5,
        grav: 0.03,
        type: 'dust',
        rot: Math.random() * 6,
        rotV: (Math.random() - 0.5) * 0.25,
      });
    }
  },
};

export const ALPHA_VFX_UPDATE = {
  aether_rivet_bloom(v) {
    const s = v.spell;
    if (v.state === 0) {
      const pullR = v.radius * (1 - v.age / 14);
      if (v.age % 2 === 0) {
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = pullR * (0.5 + Math.random() * 0.5);
          spawnP(v.cx + Math.cos(a) * d, v.cy + Math.sin(a) * d, s.c2, 1, 'trail');
        }
      }
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = v.cx - ex;
        const dy = v.cy - ey;
        const d = Math.hypot(dx, dy) || 1;
        if (d >= pullR) continue;
        const f = (1 - d / pullR) * 0.65 / (e.mass || 1);
        e.vx += (dx / d) * f * 2;
        e.vy += (dy / d) * f * 1.6 - 0.05;
      }
      state.dynamicLights.push({
        x: v.cx,
        y: v.cy,
        r: 30 + pullR * 0.45,
        color: s.c2,
        int: 0.95,
        life: 2,
        ml: 2,
      });
      if (v.age >= 14) {
        v.state = 1;
        v.age = 0;
      }
      return;
    }

    if (v.state === 1) {
      if (v.age === 1) {
        explode(v.cx, v.cy, v.radius, 10, v.damage, s.color, s.c2);
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: v.radius * 1.8, color: s.core, int: 2.4, life: 10, ml: 10 });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: v.radius * 0.75, life: 12, maxLife: 12, color: s.core });
        SoundFX.playNoise(0.38, 0.22, 860, 'bandpass', 5);
      }
      if (v.age % 2 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 24, v.cy + (Math.random() - 0.5) * 24, s.core, 2, 'sparkle');
      }
      if (v.age > 13) {
        v.state = 2;
        v.age = 0;
      }
      return;
    }

    if (v.age % 3 === 0) spawnP(v.cx, v.cy, s.c2, 1, 'void');
    if (v.age > 10) removeAlphaVfx(v);
  },

  aetherforge_eidolon(v) {
    const s = v.spell;
    const pulseEvery = s.pulseEvery || 30;
    const pulseR = s.summonR || 170;

    for (let i = v.pulseFx.length - 1; i >= 0; i--) {
      const fx = v.pulseFx[i];
      fx.age += 1;
      fx.r = (fx.age / fx.maxAge) * fx.maxR;
      if (fx.age > fx.maxAge) v.pulseFx.splice(i, 1);
    }

    if (v.state === 0) {
      if (v.age % 2 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 24, v.cy + (Math.random() - 0.5) * 24, s.c2, 2, 'sparkle');
        spawnP(v.cx + (Math.random() - 0.5) * 36, v.cy + (Math.random() - 0.5) * 20, s.color, 2, 'dust');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 80 + v.age * 2.2, color: s.core, int: 1.05, life: 2, ml: 2 });
      if (v.age > 24) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(240, 960, 'sawtooth', 0.22, 0.12);
      }
      return;
    }

    if (v.state === 1) {
      v.lifeLeft -= 1;
      const target = nearestEntity(v.cx, v.cy, pulseR * 1.4);
      const desiredX = target
        ? target.x + target.w / 2 + Math.sin(v.age * 0.08 + v.seed) * 18
        : v.anchorX + Math.sin(v.age * 0.04 + v.seed) * 22;
      const desiredY = target
        ? target.y - 34 + Math.cos(v.age * 0.06 + v.seed * 0.7) * 10
        : v.anchorY - 20 + Math.cos(v.age * 0.03 + v.seed * 0.4) * 16;

      v.vx = (v.vx || 0) * 0.88 + (desiredX - v.cx) * 0.06;
      v.vy = (v.vy || 0) * 0.86 + (desiredY - v.cy) * 0.065;
      v.cx += v.vx;
      v.cy += v.vy;

      for (let i = 0; i < v.hammers.length; i++) {
        const h = v.hammers[i];
        h.phase += 0.085 + i * 0.012;
        const hr = (s.hammerR || 44) + Math.sin(v.age * 0.13 + h.phase) * 6;
        h.x = v.cx + Math.cos(h.phase) * hr;
        h.y = v.cy + Math.sin(h.phase) * (hr * 0.62);

        if (v.age % 2 === 0) spawnP(h.x, h.y, i % 2 === 0 ? s.c2 : s.core, 1, 'trail');

        for (const e of state.entities) {
          if (!e.active) continue;
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          const d = Math.hypot(ex - h.x, ey - h.y);
          if (d > 20 + Math.max(e.w, e.h) * 0.3) continue;
          if (v.age - h.lastHit < 14) continue;
          h.lastHit = v.age;
          hurtEntity(e, s.hammerDmg || 8, h.x, h.y);
          const pushA = Math.atan2(ey - v.cy, ex - v.cx);
          e.vx += Math.cos(pushA) * 2.5 / (e.mass || 1);
          e.vy += Math.sin(pushA) * 2.1 / (e.mass || 1) - 0.5;
          spawnP(ex, ey, s.core, 5, 'burst');
          SoundFX.playTone(320 + i * 80, 'square', 0.08, 0.06);
        }
      }

      if (v.age % pulseEvery === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          const dx = v.cx - ex;
          const dy = v.cy - ey;
          const d = Math.hypot(dx, dy) || 1;
          if (d >= pulseR) continue;

          const base = (1 - d / pulseR) * (s.pulsePull || 1.15) / (e.mass || 1);
          const tang = Math.atan2(dy, dx) + Math.PI * 0.5;
          e.vx += (dx / d) * base * 2.2 + Math.cos(tang) * base * 0.9;
          e.vy += (dy / d) * base * 1.5 + Math.sin(tang) * base * 0.6 - 0.25;
          hurtEntity(e, Math.max(2, Math.floor(s.dmg * 0.45)), v.cx, v.cy);
          pushLightningArc(v.cx, v.cy, ex, ey, s.c2);
        }

        v.pulseFx.push({ age: 0, maxAge: 16, r: 0, maxR: pulseR * 0.62 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: pulseR * 0.85, color: s.core, int: 1.4, life: 5, ml: 5 });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: pulseR * 0.55, life: 8, maxLife: 8, color: s.c2 });
        state.shake(5);
        SoundFX.playSweep(190, 560, 'triangle', 0.2, 0.18);
      }

      if (v.age % 4 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 18, v.cy + (Math.random() - 0.5) * 14, s.color, 1, 'ember');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 58, color: s.c2, int: 0.8, life: 2, ml: 2 });

      if (v.lifeLeft <= 0) {
        v.state = 2;
        v.age = 0;
      }
      return;
    }

    if (v.state === 2) {
      if (v.age === 1) {
        explode(v.cx, v.cy, (s.summonR || 170) * 0.55, 10, s.dmg * 2, s.color, s.core);
        spawnP(v.cx, v.cy, s.core, 18, 'sparkle');
        SoundFX.playNoise(0.4, 0.24, 320, 'lowpass');
      }
      if (v.age % 2 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 22, v.cy + (Math.random() - 0.5) * 22, s.c2, 1, 'void');
      }
      if (v.age > 22) removeAlphaVfx(v);
    }
  },
};

export const ALPHA_VFX_DRAW = {
  aether_rivet_bloom(v, X) {
    const s = v.spell;
    if (v.state === 0) {
      const p = Math.min(1, v.age / 14);
      const r = v.radius * (1 - p * 0.75);
      X.save();
      X.globalAlpha = 0.5 + (1 - p) * 0.35;
      X.strokeStyle = s.c2;
      X.lineWidth = 2.5;
      X.setLineDash([8, 7]);
      X.beginPath();
      X.arc(v.cx, v.cy, Math.max(8, r), 0, Math.PI * 2);
      X.stroke();
      X.setLineDash([]);
      X.globalAlpha = 0.35;
      X.fillStyle = s.core;
      X.beginPath();
      X.arc(v.cx, v.cy, Math.max(4, r * 0.3), 0, Math.PI * 2);
      X.fill();
      X.restore();
      return;
    }

    if (v.state === 1) {
      const p = Math.min(1, v.age / 13);
      const r = 10 + v.radius * p;
      X.save();
      X.globalAlpha = 0.7 * (1 - p * 0.55);
      const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r);
      g.addColorStop(0, s.core);
      g.addColorStop(0.38, s.c2);
      g.addColorStop(1, 'rgba(127,146,255,0)');
      X.fillStyle = g;
      X.beginPath();
      X.arc(v.cx, v.cy, r, 0, Math.PI * 2);
      X.fill();
      X.globalAlpha = 0.8 * (1 - p);
      X.strokeStyle = s.color;
      X.lineWidth = 3;
      X.beginPath();
      X.arc(v.cx, v.cy, r * 0.82, 0, Math.PI * 2);
      X.stroke();
      X.restore();
      return;
    }

    X.save();
    X.globalAlpha = Math.max(0, 0.4 - v.age * 0.03);
    X.strokeStyle = s.c2;
    X.lineWidth = 1.5;
    X.beginPath();
    X.arc(v.cx, v.cy, v.radius * 0.4 + v.age * 2, 0, Math.PI * 2);
    X.stroke();
    X.restore();
  },

  aetherforge_eidolon(v, X) {
    const s = v.spell;
    const t = (state.t || 0) + v.age;
    const idleScale = v.state === 0 ? Math.min(1, v.age / 24) : 1;

    X.save();
    X.translate(v.cx, v.cy);

    if (v.state === 0) {
      X.globalAlpha = 0.35 + idleScale * 0.5;
      X.strokeStyle = s.c2;
      X.lineWidth = 2;
      X.setLineDash([10, 7]);
      X.beginPath();
      X.ellipse(0, 0, 24 + v.age * 1.9, 12 + v.age * 1.1, Math.sin(t * 0.06) * 0.2, 0, Math.PI * 2);
      X.stroke();
      X.setLineDash([]);
    }

    const glowR = 18 + Math.sin(t * 0.09 + v.seed) * 4;
    const coreGrad = X.createRadialGradient(0, 0, 0, 0, 0, 42);
    coreGrad.addColorStop(0, s.core);
    coreGrad.addColorStop(0.42, s.c2);
    coreGrad.addColorStop(1, 'rgba(255,139,74,0)');
    X.globalAlpha = 0.85 * idleScale;
    X.fillStyle = coreGrad;
    X.beginPath();
    X.arc(0, 0, 42, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.95 * idleScale;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, glowR, 0, Math.PI * 2);
    X.fill();

    X.strokeStyle = s.core;
    X.lineWidth = 1.5;
    X.globalAlpha = 0.8 * idleScale;
    X.beginPath();
    X.arc(0, 0, 26 + Math.sin(t * 0.08) * 3, 0, Math.PI * 2);
    X.stroke();

    if (v.state !== 0) {
      X.globalAlpha = 0.35;
      X.strokeStyle = s.c2;
      X.lineWidth = 1.8;
      X.setLineDash([7, 5]);
      X.beginPath();
      X.ellipse(0, 0, (s.hammerR || 44) + 8, (s.hammerR || 44) * 0.62 + 5, Math.sin(t * 0.04) * 0.16, 0, Math.PI * 2);
      X.stroke();
      X.setLineDash([]);

      for (const h of v.hammers) {
        const hx = h.x - v.cx;
        const hy = h.y - v.cy;
        const a = Math.atan2(hy, hx) + Math.PI * 0.5;
        X.save();
        X.translate(hx, hy);
        X.rotate(a);
        X.globalAlpha = 0.9;
        X.fillStyle = s.c2;
        X.fillRect(-6, -4, 12, 8);
        X.fillStyle = s.core;
        X.fillRect(-2, -13, 4, 9);
        X.restore();
      }
    }

    X.restore();

    for (const fx of v.pulseFx) {
      X.save();
      X.globalAlpha = 0.65 * (1 - fx.age / fx.maxAge);
      X.strokeStyle = s.core;
      X.lineWidth = 2.6;
      X.beginPath();
      X.arc(v.cx, v.cy, fx.r, 0, Math.PI * 2);
      X.stroke();
      X.restore();
    }
  },
};
