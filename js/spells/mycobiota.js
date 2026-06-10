// mycobiota.js — Fungi, bacteria, spores, biofilm and macro-cinema magic.
// The school reads like Nature seen through a petri dish: colonies bloom,
// hyphae bind, bacteria swarm, and the arena briefly becomes microscope film.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { createAlly } from '../core/allies.js?v=1';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=9';

const PAL = {
  color: '#8fcf5a',
  c2: '#d8f2a1',
  core: '#fff6d7',
  spore: '#c7ff6b',
  agar: '#f0d7cf',
  petri: '#9fd7c2',
  bruise: '#4f2d68',
  biofilm: '#d4ffe6',
  amber: '#d8944a',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function center(entity) {
  return {
    x: entity.x + entity.w / 2,
    y: entity.y + entity.h / 2,
  };
}

function enemiesInRadius(x, y, radius) {
  return state.entities.filter((entity) => {
    if (!isEnemyEntity(entity)) return false;
    const c = center(entity);
    return Math.hypot(c.x - x, c.y - y) <= radius;
  });
}

function ensureInfectionTicker() {
  if (!state.vfxSequences.some((vfx) => vfx.type === 'mycobiota_infection_status')) {
    state.vfxSequences.push({ type: 'mycobiota_infection_status', state: 0, age: 0, spell: STATUS_SPELL });
  }
}

function infectEntity(entity, frames = 240, stacks = 1) {
  if (!isEnemyEntity(entity)) return;
  const prev = entity._mycobiota || { frames: 0, stacks: 0 };
  entity._mycobiota = {
    frames: Math.max(prev.frames || 0, frames),
    stacks: clamp((prev.stacks || 0) + stacks, 1, 5),
  };
  ensureInfectionTicker();
  spawnP(entity.x + entity.w / 2, entity.y + entity.h / 2, PAL.spore, 5, 'sparkle');
}

function infectionPower(entity) {
  return clamp(entity?._mycobiota?.stacks || 0, 0, 5);
}

function damageRadius(cx, cy, radius, damage, options = {}) {
  const { infect = 0, freeze = 0, force = 0 } = options;
  for (const entity of enemiesInRadius(cx, cy, radius)) {
    const c = center(entity);
    const distance = Math.hypot(c.x - cx, c.y - cy) || 1;
    const pct = clamp(1 - distance / radius, 0.2, 1);
    hurtEntity(entity, Math.max(1, Math.floor(damage * pct)), cx, cy);
    if (infect) infectEntity(entity, infect, 1);
    if (freeze) state.frozenEntities.set(entity, Math.max(state.frozenEntities.get(entity) || 0, freeze));
    if (force) {
      entity.vx += (c.x - cx) / distance * force * pct / (entity.mass || 1);
      entity.vy += (c.y - cy) / distance * force * pct / (entity.mass || 1) - 0.8;
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  const x = x1 + dx * t;
  const y = y1 + dy * t;
  return { distance: Math.hypot(px - x, py - y), x, y };
}

function drawPetriRings(X, cx, cy, radius, age, spell, alpha = 1) {
  X.save();
  X.globalAlpha = alpha;
  X.strokeStyle = spell.c2;
  X.lineWidth = 1.2;
  for (let ring = 0; ring < 4; ring++) {
    const r = radius * ((ring + 1) / 4) + Math.sin(age * 0.06 + ring) * 2;
    X.globalAlpha = alpha * (0.24 + ring * 0.1);
    X.beginPath();
    X.arc(cx, cy, r, 0, Math.PI * 2);
    X.stroke();
  }
  X.restore();
  X.globalAlpha = 1;
}

function drawMushroomCap(X, x, y, scale, spell, age) {
  X.save();
  X.translate(x, y);
  X.scale(scale, scale);
  const pulse = 1 + Math.sin(age * 0.07) * 0.04;
  X.scale(pulse, 1);
  X.fillStyle = spell.color;
  X.beginPath();
  X.ellipse(0, 0, 14, 7, 0, Math.PI, 0);
  X.lineTo(12, 1);
  X.quadraticCurveTo(0, 6, -12, 1);
  X.closePath();
  X.fill();
  X.fillStyle = spell.core;
  X.globalAlpha = 0.9;
  X.beginPath();
  X.ellipse(-5, -2, 2.2, 1.4, 0, 0, Math.PI * 2);
  X.ellipse(2, -4, 1.8, 1.2, 0, 0, Math.PI * 2);
  X.ellipse(7, -1, 1.5, 1, 0, 0, Math.PI * 2);
  X.fill();
  X.globalAlpha = 0.8;
  X.strokeStyle = spell.core;
  X.lineWidth = 1;
  for (let i = -4; i <= 4; i += 2) {
    X.beginPath();
    X.moveTo(i, 1);
    X.lineTo(i * 0.5, 6);
    X.stroke();
  }
  X.restore();
  X.globalAlpha = 1;
}

const STATUS_SPELL = {
  name: 'Mycobiota Status',
  color: PAL.color,
  c2: PAL.c2,
  core: PAL.core,
};

export const SPELL_DEFS = [
  {
    name: 'Spore Needle', icon: '✹', key: '1', category: 'Common',
    color: PAL.color, c2: PAL.spore, core: PAL.core,
    speed: 12, dmg: 9, mana: 8, cd: 260, r: 3, grav: 0, drag: 0.998, bounce: 0,
    trail: 'mycobiota', isSporeNeedle: true, infectDur: 260,
    desc: 'Fast fungal spore dart; infects a colony under the skin on hit.',
  },
  {
    name: 'Petri Bloom', icon: '◉', key: '2', category: 'Trap',
    color: PAL.petri, c2: PAL.agar, core: PAL.core,
    speed: 0, dmg: 4, mana: 22, cd: 1250, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isPetriBloom: true, bloomR: 86, bloomDur: 220,
    desc: 'A petri dish opens in cinematic time-lapse, blooming bacterial colony rings.',
  },
  {
    name: 'Bacillus Swarm', icon: '⋯', key: '3', category: 'Common',
    color: '#b6ff70', c2: '#efffc8', core: '#ffffff',
    speed: 6.8, dmg: 8, mana: 16, cd: 680, r: 4, grav: 0, drag: 0.999, bounce: 0,
    trail: 'mycobiota', homing: true, homeStr: 0.13, isBacillusSwarm: true, splitCount: 2,
    desc: 'Homing bacteria rods chain through the air and split like bacillus cells.',
  },
  {
    name: 'Quorum Pulse', icon: '⌁', key: '4', category: 'Cast',
    color: PAL.bruise, c2: PAL.spore, core: PAL.core,
    speed: 0, dmg: 18, mana: 26, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isQuorumPulse: true, pulseR: 175,
    desc: 'Bacterial quorum signal: infected colonies answer together in a macro-cinema pulse.',
  },
  {
    name: 'Mycelium Lash', icon: '〽', key: '5', category: 'Bind',
    color: '#7fc36a', c2: '#e5ffd1', core: '#ffffff',
    speed: 0, dmg: 16, mana: 24, cd: 1250, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isMyceliumLash: true, lashDur: 78, lashRange: 250,
    desc: 'Mycelium hyphae snap from the staff, bind a target, and feed the fungal network.',
  },
  {
    name: 'Biofilm Ward', icon: '▱', key: '6', category: 'Ward',
    color: PAL.biofilm, c2: '#9fffd4', core: '#ffffff',
    speed: 0, dmg: 3, mana: 32, cd: 2600, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isBiofilmWard: true, wardDur: 260, wardW: 18,
    desc: 'A translucent biofilm membrane catches hostile shots and slicks infected enemies.',
  },
  {
    name: 'Fermentation Flask', icon: '⚗', key: '7', category: 'Lob',
    color: PAL.amber, c2: '#ffd18a', core: '#fff4c7',
    speed: 7, dmg: 12, mana: 20, cd: 980, r: 5, grav: 0.12, drag: 0.995, bounce: 0,
    trail: 'mycobiota', isFermentationFlask: true, cloudR: 78, cloudDur: 170,
    desc: 'Fermentation gas pops from a flask, leaving fizzy bacterial vapor and knockback.',
  },
  {
    name: 'Antibiotic Halo', icon: '◎', key: '8', category: 'Ward',
    color: '#f4ffe8', c2: '#9fffd0', core: '#ffffff',
    speed: 0, dmg: 20, mana: 34, cd: 2400, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isAntibioticHalo: true, haloR: 180,
    desc: 'Clean antibiotic ring clears hostile projectiles and burns overgrown colonies.',
  },
  {
    name: 'Cordyceps Marionette', icon: '♟', key: '9', category: 'Summon',
    color: '#b9d65d', c2: '#ffe7b0', core: '#ffffff',
    speed: 0, dmg: 9, mana: 42, cd: 4200, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isCordycepsMarionette: true, summonDur: 440,
    desc: 'Cordyceps puppet rises under a mushroom cap and hunts through fungal impulses.',
  },
  {
    name: 'Fruiting Crown', icon: '♛', key: '0', category: 'Ultimate',
    color: '#d7ff79', c2: '#ffdf9a', core: '#ffffff',
    speed: 0, dmg: 52, mana: 90, cd: 60000, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'mycobiota', isFruitingCrown: true, crownR: 235, crownDur: 360,
    desc: '(Ultimate) Giant mushroom caps erupt in time-lapse; spores rain over every colony.',
  },
];

export const FIRE_HANDLERS = {
  isPetriBloom(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'mycobiota_petri_bloom', state: 0, age: 0, cx: tx, cy: ty, spell: s, hitTick: 0 });
    SoundFX.playNoise(0.18, 0.28, 260, 'lowpass');
    state.player.castAnim = 240; state.player.castType = 'slam';
    return true;
  },

  isQuorumPulse(s) {
    const c = center(state.player);
    state.vfxSequences.push({ type: 'mycobiota_quorum_pulse', state: 0, age: 0, cx: c.x, cy: c.y, spell: s, fired: false });
    SoundFX.playSweep(220, 760, 'sine', 0.35, 0.18);
    state.player.castAnim = 300; state.player.castType = 'front_pose'; state.player.staffGlow = 280;
    return true;
  },

  isMyceliumLash(s, ox, oy, tx, ty) {
    const target = nearestEnemyEntity(tx, ty, s.lashRange || 250) || nearestEnemyEntity(ox, oy, s.lashRange || 250);
    const tc = target ? center(target) : { x: tx, y: ty };
    state.vfxSequences.push({ type: 'mycobiota_mycelium_lash', state: 0, age: 0, ox, oy, tx: tc.x, ty: tc.y, target, spell: s, ticks: 0 });
    SoundFX.playSweep(380, 120, 'triangle', 0.32, 0.16);
    state.player.castAnim = 260; state.player.castType = 'thrust';
    return true;
  },

  isBiofilmWard(s, ox, oy, tx, ty) {
    const dx = tx - ox;
    const dy = ty - oy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const half = 88;
    const cx = ox + nx * Math.min(120, len);
    const cy = oy + ny * Math.min(80, len);
    state.vfxSequences.push({
      type: 'mycobiota_biofilm_ward',
      state: 0,
      age: 0,
      x1: cx - ny * half,
      y1: cy + nx * half,
      x2: cx + ny * half,
      y2: cy - nx * half,
      spell: s,
      blocked: 0,
    });
    SoundFX.playTone(520, 'triangle', 0.18, 0.16);
    state.player.castAnim = 260; state.player.castType = 'front_pose';
    return true;
  },

  isAntibioticHalo(s) {
    const c = center(state.player);
    state.vfxSequences.push({ type: 'mycobiota_antibiotic_halo', state: 0, age: 0, cx: c.x, cy: c.y, spell: s, cleared: 0, hitSet: new Set() });
    SoundFX.playSweep(900, 1500, 'sine', 0.32, 0.16);
    state.player.castAnim = 260; state.player.castType = 'burst';
    return true;
  },

  isCordycepsMarionette(s, ox, oy, tx, ty) {
    const puppet = createAlly({
      x: clamp(tx - 8, 8, state.W - 28),
      y: clamp(ty - 28, 20, state.H - 36),
      w: 16,
      h: 34,
      mana: s.mana,
      type: 'mycobiotaCordyceps',
      threat: 62,
      color: s.color,
      c2: s.c2,
      hpScale: 2.3,
    });
    state.entities.push(puppet);
    state.vfxSequences.push({ type: 'mycobiota_cordyceps_marionette', state: 0, age: 0, ally: puppet, spell: s, attackCd: 25 });
    SoundFX.playNoise(0.2, 0.32, 180, 'bandpass', 4);
    state.player.castAnim = 300; state.player.castType = 'front_pose';
    return true;
  },

  isFruitingCrown(s) {
    const c = center(state.player);
    const caps = Array.from({ length: 9 }, (_, i) => {
      const angle = (i / 9) * Math.PI * 2;
      const radius = 45 + (i % 3) * 46;
      return {
        x: c.x + Math.cos(angle) * radius,
        y: c.y + Math.sin(angle) * radius * 0.58,
        seed: i * 1.7,
        scale: 0,
      };
    });
    state.vfxSequences.push({ type: 'mycobiota_fruiting_crown', state: 0, age: 0, cx: c.x, cy: c.y, spell: s, caps, hitTicks: 0 });
    SoundFX.playSweep(160, 680, 'sawtooth', 0.55, 0.35);
    state.player.castAnim = 600; state.player.castType = 'up'; state.player.staffGlow = 600;
    state.shake(9);
    return true;
  },
};

export const PROJ_HOOKS = {
  isSporeNeedle: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && isEnemyEntity(hitEntity)) infectEntity(hitEntity, s.infectDur || 260, 1);
      state.vfxSequences.push({ type: 'mycobiota_spore_pop', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
      SoundFX.playNoise(0.12, 0.14, 520, 'bandpass', 5);
      return true;
    },
  },

  isBacillusSwarm: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && isEnemyEntity(hitEntity)) infectEntity(hitEntity, 220, 1);
      state.vfxSequences.push({ type: 'mycobiota_bacillus_split', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
      if ((p.bacillusDepth || 0) < 1) {
        const base = Math.atan2(p.vy || 0, p.vx || 1);
        for (let i = 0; i < (s.splitCount || 2); i++) {
          const angle = base + (i === 0 ? -0.55 : 0.55);
          state.projectiles.push(createPlayerProjectile({
            x: p.x,
            y: p.y,
            vx: Math.cos(angle) * (s.speed * 0.78),
            vy: Math.sin(angle) * (s.speed * 0.78),
            spell: s,
            life: 80,
            bacillusDepth: (p.bacillusDepth || 0) + 1,
          }));
        }
      }
      SoundFX.playTone(680, 'square', 0.1, 0.08);
      return true;
    },
  },

  isFermentationFlask: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && isEnemyEntity(hitEntity)) infectEntity(hitEntity, 190, 1);
      state.vfxSequences.push({ type: 'mycobiota_fermentation_cloud', state: 0, age: 0, cx: p.x, cy: p.y, spell: s, hitTick: 0 });
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: s.cloudR || 78, life: 16, maxLife: 16, color: s.c2 });
      SoundFX.playNoise(0.25, 0.28, 220, 'lowpass');
      return true;
    },
  },
};

export const TRAIL_EMITTERS = {
  mycobiota(p, s) {
    const color = Math.random() > 0.5 ? s.c2 : PAL.spore;
    spawnP(p.x + (Math.random() - 0.5) * 5, p.y + (Math.random() - 0.5) * 5, color, 1, 'sparkle');
  },
};

export const PROJ_DRAW = {
  mycobiota(p, s, X) {
    const r = p.growR || s.r || 4;
    X.save();
    X.globalCompositeOperation = 'lighter';
    const glow = X.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
    glow.addColorStop(0, s.core);
    glow.addColorStop(0.35, s.c2);
    glow.addColorStop(1, 'transparent');
    X.fillStyle = glow;
    X.globalAlpha = 0.34;
    X.beginPath();
    X.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
    X.fill();
    X.globalCompositeOperation = 'source-over';
    X.translate(p.x, p.y);
    X.rotate(Math.atan2(p.vy || 0, p.vx || 1));
    if (s.isBacillusSwarm) {
      X.fillStyle = s.color;
      X.beginPath();
      X.ellipse(0, 0, r * 1.9, r * 0.75, 0, 0, Math.PI * 2);
      X.fill();
      X.fillStyle = s.core;
      X.globalAlpha = 0.8;
      X.fillRect(-r * 0.7, -0.8, r * 1.4, 1.6);
    } else if (s.isFermentationFlask) {
      X.fillStyle = '#6d4a24';
      X.fillRect(-r, -r, r * 2, r * 2);
      X.fillStyle = s.c2;
      X.globalAlpha = 0.8;
      X.fillRect(-r * 0.6, -r * 0.45, r * 1.2, r * 0.9);
    } else {
      X.fillStyle = s.color;
      X.beginPath();
      X.moveTo(r * 2.3, 0);
      X.lineTo(-r * 1.2, -r);
      X.lineTo(-r * 0.4, 0);
      X.lineTo(-r * 1.2, r);
      X.closePath();
      X.fill();
      X.fillStyle = s.core;
      X.beginPath();
      X.arc(r * 0.6, 0, r * 0.42, 0, Math.PI * 2);
      X.fill();
    }
    X.restore();
    X.globalAlpha = 1;
  },
};

export const VFX_UPDATE = {
  mycobiota_infection_status(v) {
    let infected = 0;
    for (const entity of state.entities) {
      if (!entity?._mycobiota) continue;
      entity._mycobiota = {
        ...entity._mycobiota,
        frames: entity._mycobiota.frames - 1,
      };
      if (entity._mycobiota.frames <= 0 || !entity.active) {
        entity._mycobiota = null;
      } else {
        infected += 1;
        if (entity._mycobiota.frames % 70 === 0) {
          hurtEntity(entity, entity._mycobiota.stacks, entity.x + entity.w / 2, entity.y);
        }
      }
    }
    if (infected === 0 || v.age > 520) v.done = true;
  },

  mycobiota_spore_pop(v) {
    if (v.age === 1) {
      spawnP(v.cx, v.cy, v.spell.c2, 12, 'sparkle');
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 44, color: v.spell.color, int: 0.9, life: 12, ml: 12 });
    }
    if (v.age > 28) v.done = true;
  },

  mycobiota_petri_bloom(v) {
    const s = v.spell;
    if (v.age === 1) {
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.bloomR, life: 24, maxLife: 24, color: s.c2 });
    }
    if (v.age % 26 === 0) {
      damageRadius(v.cx, v.cy, s.bloomR, s.dmg + 3, { infect: 210, freeze: 34 });
      spawnP(v.cx + (Math.random() - 0.5) * s.bloomR, v.cy + (Math.random() - 0.5) * s.bloomR * 0.5, s.c2, 3, 'sparkle');
    }
    if (v.age > s.bloomDur) v.done = true;
  },

  mycobiota_bacillus_split(v) {
    if (v.age === 1) {
      spawnP(v.cx, v.cy, v.spell.c2, 10, 'burst');
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 38, color: v.spell.color, int: 0.8, life: 10, ml: 10 });
    }
    if (v.age > 22) v.done = true;
  },

  mycobiota_quorum_pulse(v) {
    const s = v.spell;
    if (!v.fired && v.age > 18) {
      v.fired = true;
      let hits = 0;
      for (const entity of enemiesInRadius(v.cx, v.cy, s.pulseR)) {
        const stacks = infectionPower(entity);
        const c = center(entity);
        const damage = s.dmg + stacks * 7;
        hurtEntity(entity, damage, v.cx, v.cy);
        if (stacks > 0) {
          damageRadius(c.x, c.y, 46 + stacks * 6, stacks * 4, { infect: 120, force: 2.4 });
          entity._mycobiota = null;
        } else {
          infectEntity(entity, 160, 1);
        }
        hits += 1;
      }
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.pulseR, life: 28, maxLife: 28, color: s.color });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.pulseR * 1.2, color: s.c2, int: 1.1 + hits * 0.06, life: 18, ml: 18 });
      state.shake(5 + Math.min(6, hits));
    }
    if (v.age > 58) v.done = true;
  },

  mycobiota_mycelium_lash(v) {
    const s = v.spell;
    if (!v.target || !v.target.active) {
      if (v.age > 20) v.done = true;
      return;
    }
    const c = center(v.target);
    v.tx = c.x;
    v.ty = c.y;
    state.frozenEntities.set(v.target, Math.max(state.frozenEntities.get(v.target) || 0, 18));
    if (v.age % 18 === 0) {
      v.ticks += 1;
      hurtEntity(v.target, Math.max(2, Math.floor(s.dmg / 3)), v.ox, v.oy);
      infectEntity(v.target, 220, 1);
    }
    if (v.age > s.lashDur || v.ticks >= 4) v.done = true;
  },

  mycobiota_biofilm_ward(v) {
    const s = v.spell;
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = state.enemyProjectiles[i];
      const hit = distToSegment(projectile.x, projectile.y, v.x1, v.y1, v.x2, v.y2);
      if (hit.distance <= s.wardW) {
        state.enemyProjectiles.splice(i, 1);
        v.blocked += 1;
        spawnP(hit.x, hit.y, s.c2, 8, 'sparkle');
      }
    }
    for (const entity of state.entities) {
      if (!isEnemyEntity(entity)) continue;
      const c = center(entity);
      const hit = distToSegment(c.x, c.y, v.x1, v.y1, v.x2, v.y2);
      if (hit.distance <= s.wardW + 8) {
        entity.vx *= 0.86;
        entity.vy *= 0.94;
        if (v.age % 40 === 0) {
          hurtEntity(entity, s.dmg, hit.x, hit.y);
          infectEntity(entity, 150, 1);
        }
      }
    }
    if (v.age > s.wardDur) v.done = true;
  },

  mycobiota_fermentation_cloud(v) {
    const s = v.spell;
    if (v.age % 24 === 0) {
      damageRadius(v.cx, v.cy, s.cloudR, Math.max(3, Math.floor(s.dmg / 2)), { infect: 180, force: 3 });
      spawnP(v.cx + (Math.random() - 0.5) * s.cloudR, v.cy + (Math.random() - 0.5) * s.cloudR * 0.5, s.c2, 4, 'cloud');
    }
    if (v.age > s.cloudDur) v.done = true;
  },

  mycobiota_antibiotic_halo(v) {
    const s = v.spell;
    const r = clamp(v.age * 7, 0, s.haloR);
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = state.enemyProjectiles[i];
      if (Math.hypot(projectile.x - v.cx, projectile.y - v.cy) <= r) {
        state.enemyProjectiles.splice(i, 1);
        v.cleared += 1;
        spawnP(projectile.x, projectile.y, s.c2, 6, 'sparkle');
      }
    }
    for (const entity of enemiesInRadius(v.cx, v.cy, r)) {
      if (v.hitSet.has(entity)) continue;
      v.hitSet.add(entity);
      const stacks = infectionPower(entity);
      hurtEntity(entity, s.dmg + stacks * 5, v.cx, v.cy);
      entity._mycobiota = null;
    }
    if (v.age > 38) v.done = true;
  },

  mycobiota_cordyceps_marionette(v) {
    const s = v.spell;
    const ally = v.ally;
    if (!ally || !ally.active || v.age > s.summonDur) {
      if (ally) ally.active = false;
      v.done = true;
      return;
    }
    ally.age += 1;
    const c = center(ally);
    const target = nearestEnemyEntity(c.x, c.y, 210);
    if (target) {
      const tc = center(target);
      const dx = tc.x - c.x;
      const dy = tc.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      ally.vx += dx / len * 0.08;
      ally.vy += dy / len * 0.04;
      if (v.attackCd-- <= 0 && len < 42) {
        v.attackCd = 32;
        hurtEntity(target, s.dmg, c.x, c.y);
        infectEntity(target, 190, 1);
        spawnP(tc.x, tc.y, s.c2, 8, 'burst');
      }
    } else {
      v.attackCd = Math.max(0, v.attackCd - 1);
    }
    ally.vx *= 0.92;
    ally.vy = clamp((ally.vy || 0) + 0.08, -2.4, 2.8);
    ally.x = clamp(ally.x + ally.vx, 8, state.W - ally.w - 8);
    ally.y = clamp(ally.y + ally.vy, 20, state.H - ally.h - 8);
  },

  mycobiota_fruiting_crown(v) {
    const s = v.spell;
    const grow = clamp(v.age / 80, 0, 1);
    v.caps = v.caps.map((cap) => ({
      ...cap,
      scale: clamp(grow + Math.sin(v.age * 0.04 + cap.seed) * 0.08, 0, 1.25),
    }));
    if (v.age % 40 === 0) {
      damageRadius(v.cx, v.cy, s.crownR, Math.max(8, Math.floor(s.dmg / 4)), { infect: 260, freeze: 18, force: 2 });
      for (const entity of enemiesInRadius(v.cx, v.cy, s.crownR)) {
        const stacks = infectionPower(entity);
        if (stacks >= 3) {
          const c = center(entity);
          damageRadius(c.x, c.y, 54, 12 + stacks * 5, { infect: 150, force: 2.2 });
          entity._mycobiota = null;
        }
      }
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.crownR * 0.75, life: 18, maxLife: 18, color: s.color });
      state.shake(4);
    }
    if (v.age > s.crownDur) v.done = true;
  },
};

export const VFX_DRAW = {
  mycobiota_infection_status(v, X) {
    for (const entity of state.entities) {
      if (!entity?._mycobiota || !entity.active) continue;
      const c = center(entity);
      const alpha = clamp(entity._mycobiota.frames / 120, 0.2, 0.85);
      X.save();
      X.globalAlpha = alpha;
      X.fillStyle = PAL.spore;
      for (let i = 0; i < entity._mycobiota.stacks; i++) {
        const angle = v.age * 0.06 + i * Math.PI * 2 / entity._mycobiota.stacks;
        X.beginPath();
        X.arc(c.x + Math.cos(angle) * 9, c.y - 16 + Math.sin(angle) * 4, 1.7, 0, Math.PI * 2);
        X.fill();
      }
      X.restore();
    }
    X.globalAlpha = 1;
  },

  mycobiota_spore_pop(v, X) {
    const r = v.age * 2.2;
    X.save();
    X.globalAlpha = Math.max(0, 1 - v.age / 28);
    X.strokeStyle = v.spell.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.arc(v.cx, v.cy, r, 0, Math.PI * 2);
    X.stroke();
    X.fillStyle = v.spell.color;
    X.globalAlpha *= 0.2;
    X.beginPath();
    X.arc(v.cx, v.cy, r * 0.65, 0, Math.PI * 2);
    X.fill();
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_petri_bloom(v, X) {
    const s = v.spell;
    const open = clamp(v.age / 36, 0, 1);
    X.save();
    X.globalAlpha = Math.max(0, Math.min(0.55, 1 - v.age / s.bloomDur));
    X.fillStyle = s.color;
    X.beginPath();
    X.ellipse(v.cx, v.cy, s.bloomR * open, s.bloomR * 0.46 * open, 0, 0, Math.PI * 2);
    X.fill();
    drawPetriRings(X, v.cx, v.cy, s.bloomR * open, v.age, s, 0.75);
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_bacillus_split(v, X) {
    X.save();
    X.globalAlpha = Math.max(0, 1 - v.age / 22);
    X.fillStyle = v.spell.c2;
    for (let i = 0; i < 6; i++) {
      const a = v.age * 0.12 + i * Math.PI / 3;
      X.save();
      X.translate(v.cx + Math.cos(a) * v.age * 1.4, v.cy + Math.sin(a) * v.age * 1.1);
      X.rotate(a);
      X.beginPath();
      X.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
      X.fill();
      X.restore();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_quorum_pulse(v, X) {
    const s = v.spell;
    const r = clamp((v.age - 12) * 7, 0, s.pulseR);
    X.save();
    X.globalAlpha = Math.max(0, 0.85 - v.age / 70);
    X.strokeStyle = s.c2;
    X.lineWidth = 2.5;
    X.beginPath();
    X.arc(v.cx, v.cy, r, 0, Math.PI * 2);
    X.stroke();
    X.strokeStyle = s.color;
    X.lineWidth = 1;
    X.setLineDash([4, 5]);
    X.beginPath();
    X.arc(v.cx, v.cy, r * 0.72, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_mycelium_lash(v, X) {
    X.save();
    X.strokeStyle = v.spell.c2;
    X.lineWidth = 2;
    X.globalAlpha = Math.max(0, 1 - v.age / (v.spell.lashDur || 78));
    X.beginPath();
    X.moveTo(v.ox, v.oy);
    const wob = Math.sin(v.age * 0.3) * 15;
    X.quadraticCurveTo((v.ox + v.tx) / 2, (v.oy + v.ty) / 2 + wob, v.tx, v.ty);
    X.stroke();
    X.lineWidth = 1;
    X.strokeStyle = v.spell.color;
    for (let i = 0; i < 3; i++) {
      X.beginPath();
      X.moveTo(v.tx, v.ty);
      X.lineTo(v.tx + Math.cos(v.age * 0.15 + i * 2.1) * 14, v.ty + Math.sin(v.age * 0.15 + i * 2.1) * 9);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_biofilm_ward(v, X) {
    X.save();
    const fade = Math.max(0, 1 - v.age / v.spell.wardDur);
    X.globalAlpha = 0.35 + fade * 0.35;
    X.strokeStyle = v.spell.c2;
    X.lineWidth = v.spell.wardW;
    X.lineCap = 'round';
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();
    X.globalAlpha = 0.9;
    X.strokeStyle = v.spell.core;
    X.lineWidth = 1.5;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_fermentation_cloud(v, X) {
    const s = v.spell;
    const fade = Math.max(0, 1 - v.age / s.cloudDur);
    X.save();
    X.globalAlpha = 0.34 * fade;
    const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, s.cloudR);
    g.addColorStop(0, s.core);
    g.addColorStop(0.35, s.c2);
    g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.beginPath();
    X.ellipse(v.cx, v.cy, s.cloudR, s.cloudR * 0.56, 0, 0, Math.PI * 2);
    X.fill();
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_antibiotic_halo(v, X) {
    const r = clamp(v.age * 7, 0, v.spell.haloR);
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = Math.max(0, 0.75 - v.age / 42);
    X.strokeStyle = v.spell.core;
    X.lineWidth = 4;
    X.beginPath();
    X.arc(v.cx, v.cy, r, 0, Math.PI * 2);
    X.stroke();
    X.strokeStyle = v.spell.c2;
    X.lineWidth = 1;
    X.beginPath();
    X.arc(v.cx, v.cy, r * 0.74, 0, Math.PI * 2);
    X.stroke();
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_cordyceps_marionette(v, X) {
    const ally = v.ally;
    if (!ally || !ally.active) return;
    const c = center(ally);
    X.save();
    X.globalAlpha = 0.28;
    X.fillStyle = '#000';
    X.beginPath();
    X.ellipse(c.x, ally.y + ally.h + 2, 9, 3, 0, 0, Math.PI * 2);
    X.fill();
    X.globalAlpha = 1;
    X.strokeStyle = v.spell.color;
    X.lineWidth = 3;
    X.lineCap = 'round';
    X.beginPath();
    X.moveTo(c.x, ally.y + 9);
    X.lineTo(c.x, ally.y + ally.h - 4);
    X.stroke();
    X.strokeStyle = v.spell.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(c.x, ally.y + 16);
    X.lineTo(c.x - 7, ally.y + 23);
    X.moveTo(c.x, ally.y + 16);
    X.lineTo(c.x + 7, ally.y + 23);
    X.stroke();
    drawMushroomCap(X, c.x, ally.y + 5, 0.68, v.spell, v.age);
    X.restore();
    X.globalAlpha = 1;
  },

  mycobiota_fruiting_crown(v, X) {
    const s = v.spell;
    X.save();
    X.globalAlpha = Math.max(0, Math.min(0.28, 1 - v.age / s.crownDur));
    const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, s.crownR);
    g.addColorStop(0, s.color);
    g.addColorStop(0.6, s.c2);
    g.addColorStop(1, 'transparent');
    X.fillStyle = g;
    X.beginPath();
    X.ellipse(v.cx, v.cy, s.crownR, s.crownR * 0.58, 0, 0, Math.PI * 2);
    X.fill();
    X.globalAlpha = 1;
    drawPetriRings(X, v.cx, v.cy, s.crownR * clamp(v.age / 90, 0, 1), v.age, s, 0.45);
    for (const cap of v.caps) {
      if (cap.scale <= 0) continue;
      drawMushroomCap(X, cap.x, cap.y, cap.scale, s, v.age + cap.seed);
    }
    X.restore();
    X.globalAlpha = 1;
  },
};
