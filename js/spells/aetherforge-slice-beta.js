// aetherforge-slice-beta.js — Aetherforge School (Beta slice)
// Agent 2 scope: Trap + Structure spells (non-ultimate)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode, isEnemyEntity } from '../core/utils.js?v=8';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function removePlatform(platform) {
  if (!platform) return;
  const idx = state.platforms.indexOf(platform);
  if (idx !== -1) state.platforms.splice(idx, 1);
}

function normalize(dx, dy) {
  const d = Math.hypot(dx, dy) || 1;
  return { nx: dx / d, ny: dy / d, d };
}

function findNearestEnemy(x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    const ex = e.x + e.w * 0.5;
    const ey = e.y + e.h * 0.5;
    const d = Math.hypot(ex - x, ey - y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function cleanupForge(v, withBurst = false) {
  if (withBurst) {
    spawnP(v.cx, v.cy, v.spell.core, 18, 'sparkle');
    spawnP(v.cx, v.cy, v.spell.color, 16, 'burst');
    state.shockwaves.push({
      x: v.cx,
      y: v.cy,
      r: 0,
      maxR: (v.spell.forgeCaptureR || 86) * 0.7,
      life: 10,
      maxLife: 10,
      color: v.spell.c2,
    });
  }
  removePlatform(v.platform);
  v.platform = null;
  removeVfx(v);
}

function triggerTrap(v, triggerX, triggerY) {
  if (v.state !== 1) return;
  v.state = 2;
  v.age = 0;
  v.triggerX = triggerX;
  v.triggerY = triggerY;
  SoundFX.playSweep(260, 1200, 'triangle', 0.28, 0.14);
  SoundFX.playNoise(0.18, 0.12, 1400, 'bandpass', 3);
  state.shake(3);
  spawnP(v.cx, v.cy, v.spell.core, 10, 'sparkle');
}

function launchForgeShard(v, shard, target) {
  const tx = target ? target.x + target.w * 0.5 : v.cx + Math.cos(shard.a) * 180;
  const ty = target ? target.y + target.h * 0.5 : v.cy - 40 + Math.sin(shard.a) * 90;
  const { nx, ny } = normalize(tx - v.cx, ty - (v.cy - 20));
  const speed = 6.5 + shard.energy * 2.6;

  state.projectiles.push({
    x: v.cx,
    y: v.cy - 20,
    vx: nx * speed,
    vy: ny * speed - 0.28,
    spell: {
      name: 'Forged Shard',
      icon: '◈',
      color: v.spell.color,
      c2: v.spell.c2,
      core: shard.color,
      trail: 'aetherforge_shard',
      speed,
      dmg: Math.max(6, Math.floor((v.spell.forgeShardDmg || 14) * shard.energy)),
      r: 4,
      grav: 0.018,
      drag: 0.996,
      bounce: 0,
      exR: 26,
      exF: 5,
      isAetherForgeShard: true,
    },
    life: 150,
    age: 0,
    trail: [],
    hitList: [],
    bounces: 0,
    _aetherOwner: v.id,
  });
}

export const BETA_SPELL_DEFS = [
  {
    name: 'Prism Snare',
    icon: '🕸️',
    key: 'F',
    category: 'Trap',
    color: '#4fdfff',
    c2: '#98f4ff',
    core: '#ffffff',
    speed: 0,
    dmg: 34,
    mana: 24,
    cd: 900,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'aetherforge',
    isAetherPrismTrap: true,
    trapArm: 22,
    trapDur: 520,
    trapTriggerR: 70,
    trapPullR: 130,
    trapInnerR: 28,
    trapPull: 0.9,
    trapImplodeT: 24,
    trapTick: 5,
    trapTickDmg: 7,
    exR: 82,
    exF: 13,
    desc: 'Hidden lattice bends projectiles, implodes enemies inward, then detonates',
  },
  {
    name: 'Foundry Bastion',
    icon: '⚙️',
    key: 'R',
    category: 'Structure',
    color: '#59e8ff',
    c2: '#9ff6ff',
    core: '#ffffff',
    speed: 0,
    dmg: 16,
    mana: 32,
    cd: 1300,
    r: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'aetherforge',
    isAetherForgeStructure: true,
    forgeDur: 460,
    forgeW: 118,
    forgeH: 16,
    forgeCaptureR: 88,
    forgeVolleyR: 320,
    forgeVolleyRate: 30,
    forgeMaxShards: 10,
    forgeShardDmg: 14,
    desc: 'Floating bastion captures nearby projectiles and reforges them into shard volleys',
  },
];

export const BETA_FIRE_HANDLERS = {
  isAetherPrismTrap(s, ox, oy, tx, ty) {
    const cx = clamp(tx, 38, state.W - 38);
    const cy = clamp(ty, 78, state.H - 34);
    state.vfxSequences.push({
      type: 'aether_prism_trap',
      state: 0,
      age: 0,
      cx,
      cy,
      id: `aether-trap-${Math.random().toString(36).slice(2, 9)}`,
      spell: s,
      seed: Math.random() * Math.PI * 2,
    });
    spawnP(cx, cy, s.color, 8, 'sparkle');
    state.dynamicLights.push({ x: cx, y: cy, r: 65, color: s.core, int: 1.4, life: 8, ml: 8 });
    SoundFX.playTone(560, 'triangle', 0.18, 0.11);
    SoundFX.playSweep(820, 420, 'sine', 0.12, 0.12);
    return true;
  },

  isAetherForgeStructure(s, ox, oy, tx, ty) {
    const w = s.forgeW || 118;
    const h = s.forgeH || 16;
    const cx = clamp(tx, 40 + w * 0.5, state.W - 40 - w * 0.5);
    const cy = clamp(ty, 105, state.H - 64);
    const platform = {
      x: cx - w * 0.5,
      y: cy,
      w,
      h,
      life: s.forgeDur + 48,
      maxLife: s.forgeDur + 48,
      isAetherForgePlatform: true,
    };
    state.platforms.push(platform);

    state.vfxSequences.push({
      type: 'aether_forge_structure',
      state: 0,
      age: 0,
      cx,
      cy,
      baseY: cy,
      id: `aether-forge-${Math.random().toString(36).slice(2, 9)}`,
      seed: Math.random() * Math.PI * 2,
      platform,
      shards: [],
      volleyCd: 16,
      spell: s,
    });

    spawnP(cx, cy, s.core, 12, 'sparkle');
    spawnP(cx, cy, s.c2, 8, 'burst');
    state.shockwaves.push({ x: cx, y: cy, r: 0, maxR: 52, life: 9, maxLife: 9, color: s.c2 });
    SoundFX.playSweep(180, 620, 'triangle', 0.3, 0.2);
    SoundFX.playNoise(0.2, 0.16, 350, 'lowpass');
    return true;
  },
};

export const BETA_PROJ_HOOKS = {
  isAetherForgeShard: {
    onUpdate(p, s) {
      if (p.age % 5 === 0) {
        const target = findNearestEnemy(p.x, p.y, 220);
        if (target) {
          const tx = target.x + target.w * 0.5;
          const ty = target.y + target.h * 0.5;
          const { nx, ny } = normalize(tx - p.x, ty - p.y);
          p.vx += nx * 0.28;
          p.vy += ny * 0.24;
        }
      }
      state.dynamicLights.push({ x: p.x, y: p.y, r: 24, color: s.core, int: 0.9, life: 2, ml: 2 });
    },
    onLand(p, s) {
      explode(
        p.x,
        p.y,
        s.exR || 26,
        s.exF || 5,
        Math.max(2, Math.floor((s.dmg || 10) * 0.5)),
        s.color,
        s.c2
      );

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w * 0.5;
        const ey = e.y + e.h * 0.5;
        const d = Math.hypot(ex - p.x, ey - p.y);
        if (d > 58) continue;
        const k = 1 - d / 58;
        hurtEntity(e, Math.max(1, Math.floor((s.dmg || 10) * 0.25 * k)), p.x, p.y);
        const { nx, ny } = normalize(ex - p.x, ey - p.y);
        e.vx += nx * 2.6 * k / (e.mass || 1);
        e.vy += ny * 1.8 * k / (e.mass || 1) - 0.8;
      }

      spawnP(p.x, p.y, s.core, 9, 'sparkle');
      SoundFX.playTone(940, 'square', 0.11, 0.08);
      return true;
    },
  },
};

export const BETA_TRAIL_EMITTERS = {
  aetherforge_shard(p, s) {
    spawnP(
      p.x + (Math.random() - 0.5) * 4,
      p.y + (Math.random() - 0.5) * 4,
      Math.random() > 0.45 ? s.core : s.c2,
      1,
      'sparkle'
    );
    if (p.age % 3 === 0) {
      state.particles.push({
        x: p.x,
        y: p.y,
        vx: -p.vx * 0.1 + (Math.random() - 0.5) * 0.4,
        vy: -p.vy * 0.1 + (Math.random() - 0.5) * 0.4,
        life: 18,
        ml: 18,
        color: s.color,
        size: 1.5 + Math.random() * 1.5,
        grav: -0.015,
        type: 'trail',
      });
    }
  },
};

export const BETA_VFX_UPDATE = {
  aether_prism_trap(v) {
    const s = v.spell;

    if (v.state === 0) {
      if (v.age % 3 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 24, v.cy + (Math.random() - 0.5) * 24, s.c2, 1, 'sparkle');
      }
      state.dynamicLights.push({
        x: v.cx,
        y: v.cy,
        r: 44 + Math.sin(v.age * 0.18) * 8,
        color: s.c2,
        int: 1.1,
        life: 2,
        ml: 2,
      });
      if (v.age >= (s.trapArm || 20)) {
        v.state = 1;
        v.age = 0;
        SoundFX.playTone(760, 'sine', 0.12, 0.08);
      }
      return;
    }

    if (v.state === 1) {
      const triggerR = s.trapTriggerR || 70;
      const fieldR = s.trapPullR || 130;

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w * 0.5;
        const ey = e.y + e.h * 0.5;
        const d = Math.hypot(ex - v.cx, ey - v.cy);
        if (d < triggerR) {
          triggerTrap(v, ex, ey);
          break;
        }
      }

      if (v.state === 1) {
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
          const p = state.projectiles[i];
          const d = Math.hypot(p.x - v.cx, p.y - v.cy);
          if (d < triggerR * 0.9) {
            triggerTrap(v, p.x, p.y);
            break;
          }

          if (d < fieldR && d > 1) {
            const { nx, ny } = normalize(v.cx - p.x, v.cy - p.y);
            const pull = (1 - d / fieldR) * 0.13;
            p.vx += nx * pull - ny * pull * 0.45;
            p.vy += ny * pull + nx * pull * 0.45;
          }
        }
      }

      if (v.age % 7 === 0) spawnP(v.cx, v.cy, s.color, 1, 'sparkle');
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: triggerR * 0.9, color: s.color, int: 0.7, life: 2, ml: 2 });

      if (v.age > (s.trapDur || 500)) {
        spawnP(v.cx, v.cy, s.c2, 8, 'dust');
        removeVfx(v);
      }
      return;
    }

    if (v.state === 2) {
      const implodeT = s.trapImplodeT || 24;
      const t = clamp(v.age / implodeT, 0, 1);
      const pullR = (s.trapPullR || 130) * (1 - 0.35 * t);
      const pullStrength = (s.trapPull || 0.9) * (1 - 0.5 * t);

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w * 0.5;
        const ey = e.y + e.h * 0.5;
        const { nx, ny, d } = normalize(v.cx - ex, v.cy - ey);
        if (d > pullR) continue;
        const f = (1 - d / pullR) * pullStrength / (e.mass || 1);
        e.vx += nx * f * 3.4 + -ny * f * 0.5;
        e.vy += ny * f * 3.2 + nx * f * 0.5 - 0.06;
        if (d < (s.trapInnerR || 28) && v.age % (s.trapTick || 5) === 0) {
          hurtEntity(e, s.trapTickDmg || 7, v.cx, v.cy);
        }
      }

      for (const p of state.projectiles) {
        const { nx, ny, d } = normalize(v.cx - p.x, v.cy - p.y);
        if (d > pullR || d < 1) continue;
        const f = (1 - d / pullR) * 0.7;
        p.vx += nx * f * 0.85 - ny * f * 0.42;
        p.vy += ny * f * 0.85 + nx * f * 0.42;
        p.vx *= 0.996;
        p.vy *= 0.996;
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = pullR * (0.45 + Math.random() * 0.5);
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r, s.core, 1, 'sparkle');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: pullR, color: s.core, int: 1.2, life: 2, ml: 2 });

      if (v.age >= implodeT) {
        v.state = 3;
        v.age = 0;
      }
      return;
    }

    if (v.state === 3) {
      if (v.age === 1) {
        const slingR = (s.exR || 82) * 1.25;
        for (const p of state.projectiles) {
          const dx = p.x - v.cx;
          const dy = p.y - v.cy;
          const d = Math.hypot(dx, dy);
          if (d > slingR || d < 1) continue;
          const { nx, ny } = normalize(dx, dy);
          const boost = 3.8 + (1 - d / slingR) * 8.4;
          p.vx = p.vx * 0.35 + nx * boost;
          p.vy = p.vy * 0.35 + ny * boost - 0.22;
          p.life = Math.max(p.life || 0, 40);
          spawnP(p.x, p.y, s.c2, 2, 'sparkle');
        }

        explode(v.cx, v.cy, s.exR || 82, s.exF || 13, s.dmg, s.color, s.c2);
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 220, color: s.core, int: 3.2, life: 8, ml: 8 });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: (s.exR || 82) * 1.35, life: 11, maxLife: 11, color: '#ffffff' });
        SoundFX.playNoise(0.45, 0.22, 900, 'bandpass', 3);
        SoundFX.playSweep(1200, 160, 'sawtooth', 0.32, 0.24);
      }

      if (v.age > 16) removeVfx(v);
    }
  },

  aether_forge_structure(v) {
    const s = v.spell;
    if (!v.platform || !state.platforms.includes(v.platform)) {
      removeVfx(v);
      return;
    }

    const w = s.forgeW || 118;
    const h = s.forgeH || 16;
    const bob = Math.sin((v.age + v.seed * 60) * 0.075) * 4;
    v.cy = v.baseY + bob;
    v.platform.x = v.cx - w * 0.5;
    v.platform.y = v.cy;
    v.platform.w = w;
    v.platform.h = h;

    const captureR = s.forgeCaptureR || 88;
    const maxShards = s.forgeMaxShards || 10;

    if (v.state === 0) {
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (p._aetherOwner === v.id) continue;
        const d = Math.hypot(p.x - v.cx, p.y - (v.cy - 22));
        if (d > captureR || v.shards.length >= maxShards) continue;

        const speed = Math.hypot(p.vx, p.vy);
        v.shards.push({
          a: Math.random() * Math.PI * 2,
          r: 24 + Math.random() * 18,
          av: (Math.random() - 0.5) * 0.055,
          energy: clamp(0.65 + speed * 0.1, 0.65, 2.3),
          color: p.spell?.core || s.core,
          life: 420,
        });
        state.projectiles.splice(i, 1);
        spawnP(v.cx, v.cy - 22, s.core, 5, 'sparkle');
        SoundFX.playTone(780 + Math.random() * 220, 'sine', 0.06, 0.05);
      }

      for (const p of state.projectiles) {
        if (p._aetherOwner === v.id) continue;
        const dx = p.x - v.cx;
        const dy = p.y - (v.cy - 18);
        const d = Math.hypot(dx, dy);
        if (d > captureR * 1.3 || d < 1) continue;
        const { nx, ny } = normalize(dx, dy);
        const swirl = (1 - d / (captureR * 1.3)) * 0.08;
        p.vx += -ny * swirl;
        p.vy += nx * swirl - 0.014;
      }

      const nextShards = [];
      for (const shard of v.shards) {
        shard.a += 0.12 + shard.av + shard.energy * 0.008;
        shard.r = clamp(shard.r + Math.sin(v.age * 0.06 + shard.a) * 0.55, 22, captureR - 9);
        shard.life -= 1;
        if (shard.life > 0) nextShards.push(shard);
        if (v.age % 2 === 0) {
          const sx = v.cx + Math.cos(shard.a) * shard.r;
          const sy = v.cy - 20 + Math.sin(shard.a) * shard.r * 0.55;
          spawnP(sx, sy, shard.color, 1, 'sparkle');
        }
      }
      v.shards = nextShards;

      if (v.age % 16 === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          const ex = e.x + e.w * 0.5;
          const ey = e.y + e.h * 0.5;
          const d = Math.hypot(ex - v.cx, ey - (v.cy - 8));
          if (d > 70) continue;
          const { nx, ny } = normalize(ex - v.cx, ey - (v.cy - 8));
          hurtEntity(e, Math.max(2, Math.floor((s.dmg || 16) * 0.4)), v.cx, v.cy);
          e.vx += nx * 2.8 / (e.mass || 1);
          e.vy += ny * 1.4 / (e.mass || 1) - 2.1;
        }
      }

      if (v.volleyCd > 0) v.volleyCd -= 1;
      if (v.volleyCd <= 0 && v.shards.length > 0) {
        const target = findNearestEnemy(v.cx, v.cy, s.forgeVolleyR || 320);
        const shots = Math.min(target ? 2 : 1, v.shards.length);
        for (let i = 0; i < shots; i++) {
          const shard = v.shards.shift();
          launchForgeShard(v, shard, target);
        }
        v.volleyCd = s.forgeVolleyRate || 30;
        SoundFX.playSweep(320, 980, 'triangle', 0.12, 0.1);
        state.shake(2);
      }

      if (v.age % 6 === 0) {
        state.dynamicLights.push({
          x: v.cx,
          y: v.cy - 16,
          r: 74 + Math.sin(v.age * 0.12) * 8,
          color: s.c2,
          int: 1.2,
          life: 3,
          ml: 3,
        });
      }

      if (v.age > (s.forgeDur || 460)) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(860, 120, 'sawtooth', 0.16, 0.22);
      }
      return;
    }

    if (v.state === 1) {
      for (const shard of v.shards) {
        shard.r *= 0.82;
        const sx = v.cx + Math.cos(shard.a) * shard.r;
        const sy = v.cy - 20 + Math.sin(shard.a) * shard.r * 0.55;
        spawnP(sx, sy, shard.color, 1, 'sparkle');
      }
      if (v.age === 10) {
        explode(v.cx, v.cy - 8, Math.floor(captureR * 0.72), 9, Math.max(8, Math.floor((s.dmg || 16) * 1.2)), s.c2, s.core);
      }
      if (v.age > 24) cleanupForge(v, true);
    }
  },
};

export const BETA_VFX_DRAW = {
  aether_prism_trap(v, X) {
    const s = v.spell;
    const pulse = Math.sin(v.age * 0.18 + (v.seed || 0)) * 0.5 + 0.5;
    const baseR = s.trapTriggerR || 70;

    X.save();
    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.2 + pulse * 0.12;
    X.strokeStyle = s.color;
    X.lineWidth = 1.5;
    X.beginPath();
    X.arc(0, 0, baseR * (v.state === 2 ? 0.7 : 1), 0, Math.PI * 2);
    X.stroke();

    X.rotate(v.age * 0.02 + (v.seed || 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = ((i + 2) / 6) * Math.PI * 2;
      X.globalAlpha = 0.17 + pulse * 0.25;
      X.strokeStyle = i % 2 ? s.c2 : s.core;
      X.beginPath();
      X.moveTo(Math.cos(a) * baseR * 0.22, Math.sin(a) * baseR * 0.22);
      X.lineTo(Math.cos(b) * baseR * 0.95, Math.sin(b) * baseR * 0.95);
      X.stroke();
    }

    if (v.state >= 2) {
      const implodeT = s.trapImplodeT || 24;
      const t = clamp(v.age / implodeT, 0, 1);
      const r = (s.trapPullR || 130) * (1 - 0.35 * t);
      X.globalAlpha = 0.18 + (1 - t) * 0.35;
      X.strokeStyle = '#ffffff';
      X.lineWidth = 2;
      X.beginPath();
      X.arc(0, 0, r, 0, Math.PI * 2);
      X.stroke();
    }

    if (v.state === 3) {
      X.globalAlpha = clamp(1 - v.age / 16, 0, 1) * 0.45;
      const grad = X.createRadialGradient(0, 0, 0, 0, 0, (s.exR || 82) * 1.25);
      grad.addColorStop(0, s.core);
      grad.addColorStop(0.5, s.c2);
      grad.addColorStop(1, 'transparent');
      X.fillStyle = grad;
      X.beginPath();
      X.arc(0, 0, (s.exR || 82) * 1.25, 0, Math.PI * 2);
      X.fill();
    }

    X.restore();
  },

  aether_forge_structure(v, X) {
    const s = v.spell;
    const coreY = v.cy - 20;
    const captureR = s.forgeCaptureR || 88;
    const pulse = Math.sin(v.age * 0.16 + (v.seed || 0)) * 0.5 + 0.5;

    X.save();

    // Field ring
    X.globalAlpha = 0.12 + pulse * 0.16;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.ellipse(v.cx, coreY, captureR, captureR * 0.52, 0, 0, Math.PI * 2);
    X.stroke();

    // Core glow
    const grad = X.createRadialGradient(v.cx, coreY, 0, v.cx, coreY, 34 + pulse * 10);
    grad.addColorStop(0, s.core);
    grad.addColorStop(0.35, s.c2);
    grad.addColorStop(1, 'transparent');
    X.globalAlpha = 0.75;
    X.fillStyle = grad;
    X.beginPath();
    X.arc(v.cx, coreY, 34 + pulse * 10, 0, Math.PI * 2);
    X.fill();

    // Conduit lines to platform
    X.globalAlpha = 0.28 + pulse * 0.22;
    X.strokeStyle = '#ffffff';
    X.lineWidth = 1.5;
    X.beginPath();
    X.moveTo(v.cx - (s.forgeW || 118) * 0.35, coreY);
    X.lineTo(v.cx - (s.forgeW || 118) * 0.46, v.cy + (s.forgeH || 16) * 0.5);
    X.moveTo(v.cx + (s.forgeW || 118) * 0.35, coreY);
    X.lineTo(v.cx + (s.forgeW || 118) * 0.46, v.cy + (s.forgeH || 16) * 0.5);
    X.stroke();

    // Orbiting shards
    for (const shard of v.shards || []) {
      const sx = v.cx + Math.cos(shard.a) * shard.r;
      const sy = coreY + Math.sin(shard.a) * shard.r * 0.55;
      X.save();
      X.translate(sx, sy);
      X.rotate(shard.a + v.age * 0.04);
      X.globalAlpha = 0.6 + Math.sin(v.age * 0.2 + shard.a) * 0.2;
      X.fillStyle = shard.color;
      X.beginPath();
      X.moveTo(0, -5);
      X.lineTo(4, 0);
      X.lineTo(0, 5);
      X.lineTo(-4, 0);
      X.closePath();
      X.fill();
      X.restore();
    }

    X.restore();
  },
};
