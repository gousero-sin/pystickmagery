// nature.js — Earth & Nature Spells Module
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
// These are the raw data objects (same format as original SPELLS array entries)
export const SPELL_DEFS = [
  { name: 'Poison Cloud', icon: '☁️', key: '9', color: '#44cc22', c2: '#88ee55', core: '#ccff88', speed: 8, dmg: 8, mana: 20, cd: 700, r: 8, grav: -.01, drag: .95, bounce: 0, trail: 'poison', isCloud: true, cloudR: 100, cloudDur: 260, cloudDmg: 4, desc: 'Toxic AoE — damages over time' },
  { name: 'Earth Spike', icon: '⛰️', key: '0', color: '#aa8844', c2: '#ccaa66', core: '#eedd99', speed: 0, dmg: 55, mana: 25, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isSpike: true, spikeW: 45, spikeH: 85, desc: 'Ground eruption at cursor' },
  { name: 'Earthquake', icon: '🌍', key: 'P', color: '#886633', c2: '#aa8844', core: '#ccaa66', speed: 0, dmg: 40, mana: 35, cd: 1200, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isQuake: true, quakeR: 280, quakeF: 12, desc: 'Shakes ground — launches all' },
  { name: 'Razor Leaf', icon: '🍃', key: 'K', color: '#33aa44', c2: '#55cc66', core: '#88ffaa', speed: 20, dmg: 22, mana: 8, cd: 150, r: 5, grav: 0, drag: 1, bounce: 0, exR: 25, exF: 4, trail: 'leaf', piercing: true, isLeaf: true, desc: 'High speed piercing leaf' },
  { name: 'Seed Barrage', icon: '🌱', key: 'L', color: '#88bb44', c2: '#aadd66', core: '#ccff88', speed: 15, dmg: 10, mana: 4, cd: 80, r: 3, grav: .12, drag: .99, bounce: 1, exR: 18, exF: 2, trail: 'seed', desc: 'Rapid-fire spreading seeds' },
  { name: 'Vine Grapple', icon: '🪴', key: ';', color: '#227733', c2: '#44aa55', core: '#77dd88', speed: 12, dmg: 20, mana: 20, cd: 600, r: 6, grav: .02, drag: .99, bounce: 0, exR: 0, exF: 0, trail: 'vine', isVine: true, vineDur: 560, vineDmg: 4, desc: 'Roots and poisons targets' },
  { name: 'Spore Burst', icon: '🍄', key: '\'', color: '#aa3355', c2: '#cc5577', core: '#ff88aa', speed: 7, dmg: 18, mana: 25, cd: 500, r: 8, grav: .05, drag: .97, bounce: 0, exR: 35, exF: 5, trail: 'spore', isSporeBomb: true, subCount: 8, subSpd: 5, subDmg: 8, subR: 40, desc: 'Explodes into floating spores' },
  { name: 'Wooden Construct', icon: '🪵', key: '/', category: 'Manifest', color: '#6b4a22', c2: '#3f8f4a', core: '#bada8c', speed: 0, dmg: 0, mana: 24, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isWoodenConstruct: true, manifestStyle: 'nature', manifestEffect: 'nature_root', manifestPulseDmg: 3, constructMax: 320, segmentHp: 32, constructThickness: 10, desc: 'Manifest wood and vines from point 1 to point 2' },
  { name: 'World Tree', icon: '🌳', key: ',', color: '#115522', c2: '#338844', core: '#66cc77', speed: 0, dmg: 60, mana: 80, cd: 6000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'earth', isWorldTree: true, treeDur: 800, treeR: 180, healAmt: 0.8, desc: 'Spawns a massive healing tree (Ultimate)' },
];

function removeVfxSequence(vfx) {
  const idx = state.vfxSequences.indexOf(vfx);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function quadPoint(a, b, c, t) {
  const it = 1 - t;
  return {
    x: it * it * a.x + 2 * it * t * b.x + t * t * c.x,
    y: it * it * a.y + 2 * it * t * b.y + t * t * c.y,
  };
}

function createWoodenConstruct(spell, p1, rawP2) {
  const rawDx = rawP2.x - p1.x;
  const rawDy = rawP2.y - p1.y;
  const rawLen = Math.hypot(rawDx, rawDy) || 1;
  const clampedLen = Math.min(spell.constructMax || 320, rawLen);
  const p2 = rawLen > clampedLen ? {
    x: p1.x + rawDx / rawLen * clampedLen,
    y: p1.y + rawDy / rawLen * clampedLen,
  } : { x: rawP2.x, y: rawP2.y };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const arch = Math.max(14, Math.min(40, len * 0.14));
  const control = {
    x: (p1.x + p2.x) * 0.5 - (dy / len) * arch * 0.35,
    y: (p1.y + p2.y) * 0.5 - arch - Math.abs(dy) * 0.08,
  };
  const segmentCount = Math.max(4, Math.min(22, Math.ceil(len / 18)));
  const points = [];
  for (let i = 0; i <= segmentCount; i++) points.push(quadPoint(p1, control, p2, i / segmentCount));

  const thickness = spell.constructThickness || 10;
  const segments = [];
  for (let i = 0; i < segmentCount; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const segment = {
      x: Math.min(a.x, b.x) - thickness * 0.7,
      y: Math.min(a.y, b.y) - thickness * 0.7,
      w: Math.max(12, Math.abs(b.x - a.x) + thickness * 1.4),
      h: thickness * 1.4,
      centerX: (a.x + b.x) * 0.5,
      centerY: (a.y + b.y) * 0.5,
      beamLen: segLen + thickness * 0.8,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      thickness,
      hp: spell.segmentHp || 32,
      maxHp: spell.segmentHp || 32,
      hitFlash: 0,
      swaySeed: Math.random() * Math.PI * 2,
      buildIndex: i,
      a,
      b,
      placed: false,
      destroyed: false,
      isWoodenConstructSegment: true,
      manifestCategory: 'Manifest',
      construct: null,
    };
    segments.push(segment);
  }

  const construct = {
    type: 'wooden_construct',
    state: 0,
    age: 0,
    spell,
    p1,
    p2,
    control,
    points,
    segments,
    buildProgress: 0,
    damageFlash: 0,
    destroyed: false,
    destroyOrigin: null,
    swaySeed: Math.random() * Math.PI * 2,
    id: `wooden-${Math.round(performance.now() * 1000)}-${Math.floor(Math.random() * 999)}`,
  };
  segments.forEach(segment => { segment.construct = construct; });
  return construct;
}

// ── Fire Handlers ──────────────────────────────────────────────────────────
// Called from fireSpell() when a matching flag is found.
// Return true to indicate "handled — skip default projectile creation".
export const FIRE_HANDLERS = {
  isWorldTree(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'worldtree', state: 0, age: 0,
      cx: state.player.x + state.player.w / 2,
      cy: state.player.y + state.player.h / 2, spell: s
    });
    state.player.inv = true;
    return true;
  },
  isSpike(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'spike', state: 0, age: 0, tx, ty, spell: s });
    return true;
  },
  isQuake(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'quake', state: 0, age: 0,
      cx: state.player.x + state.player.w / 2,
      cy: state.player.y + state.player.h, spell: s
    });
    return true;
  },
  isWoodenConstruct(s, ox, oy, tx, ty, idx) {
    const draft = state.manifestDraft;
    if (draft && draft.type === 'wooden_construct' && draft.spellIdx === idx) {
      const dist = Math.hypot(tx - draft.x, ty - draft.y);
      if (dist < 26) {
        draft.x = tx;
        draft.y = ty;
        if (draft.vfx) { draft.vfx.cx = tx; draft.vfx.cy = ty; }
        state.refundSpellCast?.(idx, s.mana);
        return true;
      }

      const construct = createWoodenConstruct(s, { x: draft.x, y: draft.y }, { x: tx, y: ty });
      removeVfxSequence(draft.vfx);
      state.manifestDraft = null;
      state.manifestConstructs.push(construct);
      state.vfxSequences.push(construct);

      SoundFX.playNoise(0.45, 0.35, 180, 'lowpass');
      SoundFX.playSweep(120, 480, 'sine', 0.45, 0.25);
      spawnP(construct.p1.x, construct.p1.y, s.core, 10, 'sparkle');
      spawnP(construct.p2.x, construct.p2.y, s.c2, 10, 'burst');
      state.dynamicLights.push({ x: construct.p1.x, y: construct.p1.y, r: 48, color: s.core, int: 1.4, life: 12, ml: 12 });
      state.dynamicLights.push({ x: construct.p2.x, y: construct.p2.y, r: 48, color: s.c2, int: 1.2, life: 12, ml: 12 });
      state.shake(5);
      return true;
    }

    if (draft?.vfx) removeVfxSequence(draft.vfx);
    const anchor = { type: 'wooden_construct_anchor', state: 0, age: 0, cx: tx, cy: ty, spell: s };
    state.manifestDraft = { type: 'wooden_construct', spellIdx: idx, x: tx, y: ty, vfx: anchor };
    state.vfxSequences.push(anchor);
    state.refundSpellCast?.(idx, s.mana);

    SoundFX.playTone(180, 'square', 0.14, 0.12);
    spawnP(tx, ty, s.c2, 8, 'burst');
    spawnP(tx, ty, s.core, 5, 'sparkle');
    state.dynamicLights.push({ x: tx, y: ty, r: 44, color: s.core, int: 1, life: 10, ml: 10 });
    return true;
  },
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
// onUpdate(p, s): called each frame for projectiles with matching spell flags.
//   Return true to remove the projectile.
// onLand(p, s, hitPlat, hitEntity): called when projectile hits something.
export const PROJ_HOOKS = {
  // isCloud: Poison Cloud slows and creates toxic zone
  isCloud: {
    onUpdate(p, s) {
      if (p.age > 10 && Math.hypot(p.vx, p.vy) < 1.5) {
        state.vfxSequences.push({ type: 'poison-cloud', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
        return true; // remove projectile
      }
    },
  },

  // isVine: Vine Grapple deploys on contact
  isVine: {
    onUpdate(p, s) {
      if (p.age <= 5) return;
      let hitE = null, hitPlat = false;
      for (const e of state.entities) {
        if (!e.active) continue;
        if (p.x > e.x && p.x < e.x + e.w && p.y > e.y && p.y < e.y + e.h) { hitE = e; break; }
      }
      if (!hitE) {
        for (const pl of state.platforms) {
          if (p.x > pl.x && p.x < pl.x + pl.w && p.y > pl.y && p.y < pl.y + pl.h) { hitPlat = true; break; }
        }
      }
      if (hitE || hitPlat || p.age > 60) {
        state.vfxSequences.push({ type: 'vine', state: 0, age: 0, cx: p.x, cy: p.y, target: hitE, spell: s });
        return true;
      }
    },
  },

  // isSporeBomb: Spore Burst splits into homing spores after delay
  isSporeBomb: {
    onUpdate(p, s) {
      if (p.age <= 30) return;
      for (let c = 0; c < s.subCount; c++) {
        const a = c / s.subCount * Math.PI * 2 + (Math.random() - .5) * .5;
        state.projectiles.push({
          x: p.x, y: p.y,
          vx: Math.cos(a) * s.subSpd, vy: Math.sin(a) * s.subSpd - 4,
          spell: {
            ...s, isCluster: false, isSporeBomb: false, r: 3, grav: 0.015,
            drag: 0.97, dmg: s.subDmg, exR: s.subR, exF: 3,
            homing: true, homeStr: 0.04, trail: 'spore', speed: s.subSpd,
            _hook: null
          },
          life: 300, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
          growR: 3, growDmg: s.subDmg,
        });
      }
      // Cinematic mushroom pop
      SoundFX.playNoise(0.4, 0.5, 150, 'lowpass');
      SoundFX.playSweep(200, 80, 'sine', 0.3, 0.4);
      spawnP(p.x, p.y, s.color, 30, 'burst');
      spawnP(p.x, p.y, s.core, 15, 'sparkle');
      spawnP(p.x, p.y, s.c2, 20, 'explode');
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: 55, life: 15, maxLife: 15, color: s.color });
      state.dynamicLights.push({ x: p.x, y: p.y, r: 120, color: s.core, int: 2.5, life: 10, ml: 10 });
      state.shake(8);
      for (let k = 0; k < 12; k++) {
        const ma = (k / 12) * Math.PI * 2;
        state.particles.push({
          x: p.x + Math.cos(ma) * 20, y: p.y + Math.sin(ma) * 10,
          vx: Math.cos(ma) * 2.5, vy: -2.5 - Math.random() * 2,
          life: 50, ml: 50, color: k % 2 ? s.color : s.c2,
          size: 4 + Math.random() * 4, grav: -0.02,
          rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.15, type: 'dust',
        });
      }
      return true;
    },
  },

  // isLeaf: Razor Leaf — fan-fired from pre_cast, spin rotation, cinematic hit
  isLeaf: {
    // Called from pre_cast instead of default single projectile
    onPreCast(s, px, py, angle, vfxSequences) {
      const fanAngles = [-0.18, 0, 0.18];
      for (let li = 0; li < 3; li++) {
        const la = angle + fanAngles[li];
        const spd = s.speed * (li === 1 ? 1 : 0.88);
        state.projectiles.push({
          x: px, y: py,
          vx: Math.cos(la) * spd, vy: Math.sin(la) * spd,
          spell: s, life: 350, age: 0, trail: [], hitList: [],
          bounces: 0, chains: 0, growR: s.r, growDmg: s.dmg, leafRot: li * 2.1,
        });
      }
      state.shockwaves.push({ x: px, y: py, r: 0, maxR: 35, life: 8, maxLife: 8, color: s.core });
      for (let k = 0; k < 3; k++) {
        const a = angle + (k - 1) * 0.3;
        spawnP(px + Math.cos(a) * 15, py + Math.sin(a) * 15, s.core, 3, 'sparkle');
      }
      state.dynamicLights.push({ x: px, y: py, r: 55, color: s.core, int: 2, life: 5, ml: 5 });
      state.shake(4);
      return true; // skip default single projectile
    },
    onUpdate(p, s) {
      // Spin the leaf each frame
      p.leafRot = (p.leafRot || 0) + 0.35;
    },
    onLand(p, s) {
      const la = Math.atan2(p.vy, p.vx);
      for (let k = 0; k < 5; k++) {
        const sa = la + (Math.random() - .5) * 1.5;
        state.particles.push({
          x: p.x, y: p.y, vx: Math.cos(sa) * (3 + Math.random() * 4),
          vy: Math.sin(sa) * (3 + Math.random() * 4),
          life: 18, ml: 18, color: k % 2 ? s.core : s.c2,
          size: 2 + Math.random() * 2, grav: 0.05,
          rot: sa, rotV: (Math.random() - .5) * 0.4, type: 'dust',
        });
      }
      state.dynamicLights.push({ x: p.x, y: p.y, r: 30, color: s.core, int: 1.5, life: 5, ml: 5 });
    },
  },

  // Seed Barrage: sprout vines/flowers on platform landing
  seed: {
    onLand(p, s, hitPlat) {
      if (!hitPlat) return;
      for (let k = 0; k < 6; k++) {
        const sa = -Math.PI / 2 + (Math.random() - .5) * 1.2;
        state.particles.push({
          x: p.x + (Math.random() - .5) * 8, y: p.y,
          vx: Math.cos(sa) * 0.5, vy: Math.sin(sa) * 0.5 - 1,
          life: 70, ml: 70, color: k % 2 ? s.color : s.c2,
          size: 2 + Math.random() * 2, grav: -0.01,
          rot: sa, rotV: (Math.random() - .5) * 0.05, type: 'dust',
        });
      }
      spawnP(p.x, p.y - 4, s.core, 4, 'sparkle');
      state.dynamicLights.push({ x: p.x, y: p.y, r: 25, color: s.core, int: 1, life: 8, ml: 8 });
    },
  },

  // Spore sub-projectile bloom on hit
  spore: {
    onLand(p, s) {
      spawnP(p.x, p.y, s.color, 8, 'burst');
      spawnP(p.x, p.y, s.core, 4, 'sparkle');
      state.dynamicLights.push({ x: p.x, y: p.y, r: 40, color: s.core, int: 1.5, life: 8, ml: 8 });
    },
  },
};

// ── Trail Particle Emitters ────────────────────────────────────────────────
// Called from updateProjectiles trail section. Key = s.trail value.
export const TRAIL_EMITTERS = {
  leaf(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - .5) * 6, y: p.y + (Math.random() - .5) * 6,
      vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2,
      life: 20, ml: 20, color: Math.random() > .5 ? s.color : s.c2,
      size: 3 + Math.random() * 2, grav: 0.02,
      rot: p.leafRot || 0, rotV: (Math.random() - .5) * 0.3, type: 'dust',
    });
    if (p.age % 4 === 0) spawnP(p.x, p.y, s.core, 1, 'sparkle');
  },
  seed(p, s) {
    spawnP(p.x + (Math.random() - .5) * 4, p.y + (Math.random() - .5) * 4,
      Math.random() > .5 ? s.color : s.c2, 1, 'dust');
    if (p.age % 6 === 0) spawnP(p.x, p.y, s.core, 1, 'sparkle');
  },
  spore(p, s) {
    spawnP(p.x + (Math.random() - .5) * 8, p.y + (Math.random() - .5) * 8,
      Math.random() > .5 ? s.color : s.c2, 1, 'sparkle');
    if (p.age % 3 === 0) spawnP(p.x, p.y, s.core, 1, 'void');
    // Pulsing glow for charging spore bomb
    if (s.isSporeBomb && p.age % 5 === 0) {
      const pulse = Math.sin(p.age * 0.4) * 0.5 + 0.5;
      state.dynamicLights.push({ x: p.x, y: p.y, r: 30 + pulse * 20, color: s.core, int: 1 + pulse, life: 5, ml: 5 });
    }
  },
  vine(p, s) {
    spawnP(p.x + (Math.random() - .5) * 5, p.y + (Math.random() - .5) * 5,
      Math.random() > .5 ? '#227733' : '#44aa55', 1, 'trail');
  },
};

// ── VFX Update Handlers ────────────────────────────────────────────────────
// Each key matches a vfxSequence.type string.
export const VFX_UPDATE = {

  wooden_construct_anchor(v) {
    const draft = state.manifestDraft;
    if (!draft || draft.vfx !== v) { removeVfxSequence(v); return; }
    v.cx = draft.x;
    v.cy = draft.y;
    if (v.age % 6 === 0) {
      spawnP(v.cx + (Math.random() - .5) * 8, v.cy + (Math.random() - .5) * 8, v.spell.c2, 1, 'dust');
      spawnP(v.cx, v.cy, v.spell.core, 1, 'sparkle');
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 30 + Math.sin(v.age * 0.15) * 8, color: v.spell.core, int: 0.9, life: 3, ml: 3 });
  },

  wooden_construct(v) {
    const s = v.spell;
    v.damageFlash = Math.max(0, (v.damageFlash || 0) - 0.05);

    if (v.destroyed) {
      if (!v.collapseBurst) {
        const burstX = v.destroyOrigin?.x ?? v.p2.x;
        const burstY = v.destroyOrigin?.y ?? v.p2.y;
        SoundFX.playNoise(0.4, 0.25, 160, 'lowpass');
        spawnP(burstX, burstY, v.destroyOrigin?.color || s.c2, 20, 'explode');
        spawnP((v.p1.x + v.p2.x) * 0.5, (v.p1.y + v.p2.y) * 0.5, s.core, 10, 'sparkle');
        state.shake(6);
        v.collapseBurst = true;
      }
      const manifestIdx = state.manifestConstructs.indexOf(v);
      if (manifestIdx !== -1) state.manifestConstructs.splice(manifestIdx, 1);
      removeVfxSequence(v);
      return;
    }

    const livingSegments = v.segments.filter(seg => seg.placed && !seg.destroyed);
    if (v.state !== 0 && livingSegments.length === 0) {
      v.destroyed = true;
      v.destroyOrigin = { x: v.p2.x, y: v.p2.y, color: s.c2 };
      return;
    }

    if (v.state === 0) {
      v.buildProgress = Math.min(1, v.buildProgress + 0.04);
      const targetSegments = Math.max(1, Math.ceil(v.buildProgress * v.segments.length));
      v.head = quadPoint(v.p1, v.control, v.p2, v.buildProgress);

      for (let i = 0; i < targetSegments; i++) {
        const seg = v.segments[i];
        if (seg.placed || seg.destroyed) continue;
        seg.placed = true;
        state.platforms.push(seg);
        spawnP(seg.centerX, seg.centerY, i % 2 === 0 ? s.color : s.c2, 4, 'dust');
        spawnP(seg.centerX, seg.centerY, s.core, 2, 'sparkle');
      }

      if (v.age % 3 === 0) {
        spawnP(v.head.x + (Math.random() - .5) * 10, v.head.y + (Math.random() - .5) * 10, s.c2, 2, 'dust');
        spawnP(v.head.x, v.head.y, s.core, 1, 'sparkle');
      }
      state.dynamicLights.push({ x: v.head.x, y: v.head.y, r: 42, color: s.core, int: 1.4, life: 4, ml: 4 });
      state.dynamicLights.push({ x: v.p1.x, y: v.p1.y, r: 28, color: s.c2, int: 0.8, life: 3, ml: 3 });

      if (v.buildProgress >= 1) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(280, 120, 'triangle', 0.35, 0.16);
        state.shockwaves.push({ x: v.p2.x, y: v.p2.y, r: 0, maxR: 28, life: 8, maxLife: 8, color: s.c2 });
      }
      return;
    }

    if (livingSegments.length && v.age % 18 === 0) {
      const seg = livingSegments[(Math.random() * livingSegments.length) | 0];
      spawnP(seg.centerX + (Math.random() - .5) * 6, seg.centerY + (Math.random() - .5) * 6, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
    }
    if (livingSegments.length && v.age % 28 === 0) {
      const seg = livingSegments[(Math.random() * livingSegments.length) | 0];
      state.particles.push({
        x: seg.centerX,
        y: seg.centerY - 4,
        vx: (Math.random() - .5) * 0.6,
        vy: -0.5 - Math.random() * 0.4,
        life: 40,
        ml: 40,
        color: Math.random() > 0.5 ? '#4f9a4f' : '#88cc66',
        size: 2 + Math.random() * 2,
        grav: -0.01,
        rot: Math.random() * 6,
        rotV: (Math.random() - .5) * 0.08,
        type: 'dust',
      });
    }
    state.dynamicLights.push({ x: v.p1.x, y: v.p1.y, r: 22, color: s.c2, int: 0.45, life: 2, ml: 2 });
    state.dynamicLights.push({ x: v.p2.x, y: v.p2.y, r: 22, color: s.core, int: 0.45, life: 2, ml: 2 });
  },

  // ─── POISON CLOUD ───
  'poison-cloud'(v) {
    const s = v.spell;
    if (v.state === 0) { // Gathering void particles
      if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - .5) * s.cloudR * 1.5, v.cy + (Math.random() - .5) * s.cloudR * 1.5, s.color, 1, 'void');
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: v.age * 3, color: s.color, int: 0.5, life: 2, ml: 2 });
      if (v.age > 18) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) { // Initial burst
      if (v.age === 1) {
        spawnP(v.cx, v.cy, s.c2, 12, 'burst');
        state.shake(3);
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.cloudR, color: s.color, int: 2, life: 8, ml: 8 });
      }
      if (v.age > 8) { v.state = 2; v.age = 0; }
    } else if (v.state === 2) { // Small cloud forming
      if (v.age % 3 === 0) state.particles.push({ x: v.cx + (Math.random() - .5) * 20, y: v.cy + (Math.random() - .5) * 10, vx: 0, vy: -1, life: 20, ml: 20, color: s.color, size: 2 + Math.random() * 4, grav: -0.01, type: 'cloud' });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.cloudR * 0.6, color: s.color, int: 0.6, life: 2, ml: 2 });
      if (v.age > 20) { v.state = 3; v.age = 0; }
    } else if (v.state === 3) { // Expanding toxic cloud + damage
      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * s.cloudR * (v.age / 120);
        state.particles.push({ x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d * .5, vx: (Math.random() - .5) * 1, vy: -Math.random() * 2, life: 30, ml: 30, color: Math.random() > .5 ? s.color : s.c2, size: 3 + Math.random() * 4, grav: -0.03, type: 'cloud' });
      }
      // Bubbling toxic puffs
      if (v.age % 8 === 0) {
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * Math.PI * 2, d = Math.random() * s.cloudR * 0.5;
          spawnP(v.cx + Math.cos(a) * d, v.cy + Math.sin(a) * d * .5, s.core, 1, 'sparkle');
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.cloudR * 1.2, color: s.color, int: 0.8, life: 2, ml: 2 });
      if (v.age % 15 === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.cloudR * (v.age / 120)) {
            hurtEntity(e, 1, v.cx, v.cy);
            e.vx *= 0.85; e.vy *= 0.85;
          }
        }
      }
      if (v.age > 120) { v.state = 4; v.age = 0; }
    } else if (v.state === 4) { // Full toxic cloud — sustained damage
      if (v.age % 4 === 0) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * s.cloudR;
        state.particles.push({ x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d * .8, vx: (Math.random() - .5) * .5, vy: -Math.random() * .8 - .2, life: 25, ml: 25, color: Math.random() > .5 ? s.color : s.c2, size: 2 + Math.random() * 3, grav: -.02, type: 'cloud' });
      }
      // Glowing toxic core pulses
      if (v.age % 12 === 0) {
        spawnP(v.cx + (Math.random() - .5) * 30, v.cy + (Math.random() - .5) * 15, s.core, 3, 'sparkle');
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.cloudR * 1.5, color: s.core, int: 1.5, life: 6, ml: 6 });
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.cloudR * 1.3, color: s.color, int: 0.6, life: 2, ml: 2 });
      if (v.age % 15 === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.cloudR) {
            hurtEntity(e, s.cloudDmg, v.cx, v.cy);
            e.vx *= 0.8; e.vy *= 0.8;
          }
        }
      }
      if (v.age > s.cloudDur) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── EARTH SPIKE ───
  spike(v) {
    const s = v.spell;
    if (v.state === 0) {
      if (!v.gy) { v.gy = state.H - 24; for (const p of state.platforms) { if (v.tx > p.x && v.tx < p.x + p.w && p.y >= v.ty) v.gy = Math.min(v.gy, p.y); } }
      state.dynamicLights.push({ x: v.tx, y: v.gy, r: v.age * 5, color: s.core, int: 1.2, life: 2, ml: 2 });
      if (v.age % 2 === 0) spawnP(v.tx + (Math.random() - .5) * s.spikeW, v.gy, s.core, 2, 'sparkle');
      if (v.age % 3 === 0) spawnP(v.tx + (Math.random() - .5) * s.spikeW * 1.5, v.gy, s.c2, 1, 'dust');
      state.shake(2);
      if (v.age > 10) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      if (v.age === 1) {
        SoundFX.playNoise(0.7, 0.5, 100, 'lowpass');
        state.shake(25);
        spawnP(v.tx, v.gy, s.c2, 35, 'burst');
        spawnP(v.tx, v.gy, '#664422', 20, 'explode');
        state.shockwaves.push({ x: v.tx, y: v.gy, r: 0, maxR: s.spikeW * 2, life: 10, maxLife: 10, color: s.color });
        state.dynamicLights.push({ x: v.tx, y: v.gy - s.spikeH / 2, r: 150, color: s.core, int: 2.5, life: 5, ml: 5 });
        state.spikes.push({ x: v.tx - s.spikeW / 2, y: v.gy, w: s.spikeW, h: 0, maxH: s.spikeH, life: 150, maxLife: 150, dmg: s.dmg, color: s.color, c2: s.c2, phase: 'rise' });
        // Heavy knockback up
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.abs(e.x + e.w / 2 - v.tx) < s.spikeW * 1.5 + e.w / 2 && Math.abs((e.y + e.h / 2) - (v.gy - s.spikeH / 2)) < s.spikeH) {
            hurtEntity(e, s.dmg, v.tx, v.gy); e.vy -= 18 / (e.mass || 1);
            e.vx += (Math.random() - .5) * 8;
          }
        }
      }
      if (v.age > 15) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
    }
  },

  // ─── EARTHQUAKE ───
  quake(v) {
    const s = v.spell;
    if (v.state === 0) {
      state.shake(8);
      state.player.castAnim = 120; state.player.castType = 'slam';
      if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - .5) * s.quakeR * 1.5, v.cy, '#ccaa66', 2, 'dust');
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: Math.min(v.age * 15, s.quakeR), color: s.core, int: 0.8, life: 2, ml: 2 });
      if (v.age > 25) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      if (v.age === 1) {
        SoundFX.playNoise(1.5, 0.8, 80, 'lowpass');
        state.shake(40);
        spawnP(v.cx, v.cy, '#886633', 60, 'explode');
        spawnP(v.cx, v.cy, s.core, 30, 'burst');
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.quakeR, life: 25, maxLife: 25, color: s.core });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.quakeR * 1.2, color: s.core, int: 2.5, life: 15, ml: 15 });
        for (const e of state.entities) {
          if (!e.active) continue;
          const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
          if (d < s.quakeR) {
            const pct = 1 - d / s.quakeR;
            e.vy -= s.quakeF * pct * 1.5 / (e.mass || 1); e.vx += (Math.random() - .5) * s.quakeF * pct * 1.5;
            if (e.rotV !== undefined) e.rotV += (Math.random() - .5) * 1.5;
            hurtEntity(e, Math.floor(s.dmg * pct), v.cx, v.cy);
          }
        }
        for (let k = 0; k < 40; k++) {
          state.particles.push({
            x: v.cx + (Math.random() - .5) * s.quakeR, y: v.cy,
            vx: (Math.random() - .5) * 8, vy: -Math.random() * 12 - 4,
            life: 80, ml: 80, color: Math.random() > .5 ? '#aa8844' : '#664422', size: 4 + Math.random() * 6,
            grav: .25, type: 'debris', rot: Math.random() * 6, rotV: (Math.random() - .5) * .5,
          });
        }
      }
      if (v.age > 25) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
    }
  },

  // ─── VINE GRAPPLE ───
  vine(v) {
    const s = v.spell;
    if (v.state === 0) {
      SoundFX.playNoise(0.5, 0.6, 100, 'lowpass');
      SoundFX.playSweep(60, 300, 'sawtooth', 0.5, 0.4);
      spawnP(v.cx, v.cy, s.color, 35, 'burst');
      spawnP(v.cx, v.cy, s.core, 20, 'sparkle');
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 100, color: s.core, int: 2.5, life: 12, ml: 12 });
      state.shake(6);

      const px = state.player.x + state.player.w / 2, py = state.player.y + state.player.h / 2;
      const numPts = 24; // more segments for smoother vines
      v.vinePts = [];
      for (let si = 0; si < 5; si++) { // 5 vines forming a thick root
        const strand = [];
        for (let pi = 0; pi <= numPts; pi++) {
          const t = pi / numPts;
          const len = Math.hypot(v.cx - px, v.cy - py) || 1;
          const sag = Math.sin(t * Math.PI) * (20 + si * 12);
          const perpX = ((v.cy - py) / len) * sag;
          const perpY = (-(v.cx - px) / len) * sag;
          strand.push({ x: px + (v.cx - px) * t + perpX + (si - 2) * 6, y: py + (v.cy - py) * t + perpY + (si - 2) * 5 });
        }
        v.vinePts.push(strand);
      }
      v.anchorX = v.cx; v.anchorY = v.cy;
      v.ropeLen = Math.hypot(v.cx - px, v.cy - py);
      v.state = 1; v.age = 0;

    } else if (v.state === 1) {
      const px = state.player.x + state.player.w / 2, py = state.player.y + state.player.h / 2;

      // Rope swinging physics for player
      const dxA = v.anchorX - px, dyA = v.anchorY - py;
      const distA = Math.hypot(dxA, dyA);
      if (distA > v.ropeLen) {
        const diff = distA - v.ropeLen;
        const pullF = 0.15; // Spring constant
        state.player.vx += (dxA / distA) * diff * pullF;
        state.player.vy += (dyA / distA) * diff * pullF;
        state.player.vx *= 0.98; // rope dampening
        state.player.vy *= 0.98;
      }

      if (v.target && v.target.active) { v.anchorX = v.target.x + v.target.w / 2; v.anchorY = v.target.y + v.target.h / 2; }

      const numPts = 24, wave = Math.sin(v.age * 0.15) * 12;
      for (let si = 0; si < 5; si++) {
        const dx2 = v.anchorX - px, dy2 = v.anchorY - py, len2 = Math.hypot(dx2, dy2) || 1;
        for (let pi = 0; pi <= numPts; pi++) {
          const t = pi / numPts, sag = Math.sin(t * Math.PI) * (16 + si * 10 + wave);
          v.vinePts[si][pi] = {
            x: px + dx2 * t + (dy2 / len2) * sag + (si - 2) * 6,
            y: py + dy2 * t - (dx2 / len2) * sag + (si - 2) * 5,
          };
        }
      }

      if (v.target && v.target.active) {
        if (v.age % 6 === 0) {
          hurtEntity(v.target, s.vineDmg, v.anchorX, v.anchorY);
          v.target.vx *= 0.02; v.target.vy *= 0.02; // ultra strong root
          const wa = v.age * 0.8;
          for (let k = 0; k < 4; k++) spawnP(v.anchorX + Math.cos(wa + k * Math.PI / 2) * 25, v.anchorY - 5 + Math.sin(wa + k * Math.PI / 2) * 15, s.core, 1, 'trail');
          if (v.age % 15 === 0) spawnP(v.anchorX, v.anchorY - 20, '#aaffaa', 6, 'sparkle');
        }
        state.dynamicLights.push({ x: v.anchorX, y: v.anchorY, r: 60, color: s.color, int: 1.2, life: 2, ml: 2 });
      } else {
        if (v.age % 10 === 0) {
          for (const e of state.entities) {
            if (!e.active) continue;
            if (Math.hypot(e.x + e.w / 2 - v.anchorX, e.y + e.h / 2 - v.anchorY) < 65) {
              hurtEntity(e, s.vineDmg * 1.5, v.anchorX, v.anchorY); e.vx *= 0.2;
              spawnP(e.x + e.w / 2, e.y, s.core, 8, 'burst');
            }
          }
        }
        if (v.age % 4 === 0) spawnP(v.anchorX + (Math.random() - .5) * 20, v.anchorY + Math.random() * 8 - 4, s.core, 1, 'sparkle');
      }
      if (v.age > s.vineDur) {
        SoundFX.playNoise(0.25, 0.3, 300, 'highpass');
        spawnP(px, py, s.c2, 12, 'burst'); spawnP(v.anchorX, v.anchorY, s.c2, 15, 'burst');
        const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── WORLD TREE (ULTIMATE) — 6-state cinematic composition ───
  worldtree(v) {
    const s = v.spell;

    if (v.state === 0) {
      // Ground glows, runes form, cracks appear
      if (v.age === 1) {
        SoundFX.playSweep(40, 240, 'sine', 2.0, 1.0);
        state.player.castAnim = 440; state.player.castType = 'slam'; state.player.inv = true;
        v.gy = state.H - 24;
        for (const p of state.platforms) { if (v.cx > p.x && v.cx < p.x + p.w && p.y >= v.cy) v.gy = Math.min(v.gy, p.y); }
        v.roots = [];
        state.player.vx = 0; state.player.vy = 0; // Lock player locally
      }

      // Floating light ascending
      for (let i = 0; i < 3; i++) {
        const ra = Math.random() * Math.PI * 2, rr = Math.random() * 80 * (v.age / 60);
        state.particles.push({
          x: v.cx + Math.cos(ra) * rr, y: v.gy - 5 - Math.random() * 40 * (v.age / 60),
          vx: 0, vy: -1.5 - Math.random() * 2, life: 30, ml: 30, color: s.core, size: 2 + Math.random(), grav: -0.05, type: 'sparkle'
        });
      }
      if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - .5) * 120 * (v.age / 60), v.gy, '#33aa44', 3, 'dust');
      state.dynamicLights.push({ x: v.cx, y: v.gy, r: v.age * 6, color: s.core, int: 2.5, life: 2, ml: 2 });
      state.shake(Math.min(v.age / 8, 8)); // Slowly building intense shake
      if (v.age > 70) { v.state = 1; v.age = 0; }

    } else if (v.state === 1) {
      // 5 massive roots burst from ground
      if (v.age === 1) {
        SoundFX.playNoise(3.0, 1.0, 80, 'lowpass');
        state.shake(50);
        state.shockwaves.push({ x: v.cx, y: v.gy, r: 0, maxR: 280, life: 40, maxLife: 40, color: '#33aa44' });
        spawnP(v.cx, v.gy, '#442211', 100, 'explode');
        spawnP(v.cx, v.gy, s.core, 60, 'burst');
        state.dynamicLights.push({ x: v.cx, y: v.gy, r: 400, color: s.color, int: 4, life: 10, ml: 10 });
        v.roots = [0, 0.4, -0.4, 0.8, -0.8].map((off, ri) => ({
          ox: v.cx + Math.cos(Math.PI * 0.5 + off) * 40 * (ri === 0 ? 0 : 1),
          gy: v.gy, h: 0, maxH: 140 + Math.random() * 60, angle: off,
        }));
      }
      for (const root of v.roots) {
        root.h = Math.min(root.maxH, root.h + 8); // faster burst
        if (v.age % 2 === 0) {
          state.particles.push({
            x: root.ox + (Math.random() - .5) * 35 + Math.sin(v.age * 0.4 + root.angle) * 18,
            y: root.gy - root.h, vx: (Math.random() - .5) * 4, vy: -Math.random() * 4,
            life: 40, ml: 40, color: Math.random() > .5 ? '#442211' : s.core,
            size: 5 + Math.random() * 6, grav: 0.05, type: 'dust',
          });
        }
      }
      if (v.age === 5 || v.age === 15) {
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.gy) < 150) {
            hurtEntity(e, s.dmg, v.cx, v.gy); e.vy -= 14 / (e.mass || 1);
            e.vx += (Math.random() - .5) * 10;
          }
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.gy - 80, r: 240, color: '#225533', int: 2.2, life: 2, ml: 2 });
      if (v.age > 60) { v.state = 2; v.age = 0; }

    } else if (v.state === 2) {
      // Trunk erupts in helix spiral
      if (v.age === 1) { SoundFX.playSweep(120, 400, 'sawtooth', 1.2, 0.5); state.shake(12); v.trunkH = 0; }
      v.trunkH = Math.min(200, (v.trunkH || 0) + 5);
      for (let k = 0; k < 6; k++) {
        const ha = v.age * 0.25 + k * Math.PI / 3;
        state.particles.push({
          x: v.cx + Math.cos(ha) * (12 + k * 3), y: v.gy - v.trunkH * (k / 5),
          vx: Math.cos(ha) * 1.5, vy: -1.5, life: 35, ml: 35,
          color: k % 2 ? '#442211' : '#553311', size: 5 + Math.random() * 3, grav: 0.02, type: 'dust',
        });
      }
      if (v.age % 4 === 0) spawnP(v.cx + (Math.random() - .5) * 30, v.gy - v.trunkH, s.color, 2, 'trail');
      state.dynamicLights.push({ x: v.cx, y: v.gy - v.trunkH / 2, r: 120, color: '#225533', int: 1.8, life: 2, ml: 2 });
      if (v.age > 55) { v.state = 3; v.age = 0; }

    } else if (v.state === 3) {
      // Branches extend left and right
      if (v.age === 1) { SoundFX.playSweep(250, 700, 'sine', 1.0, 0.4); state.shake(8); v.branchL = 0; v.branchR = 0; }
      v.branchL = Math.min(130, (v.branchL || 0) + 3.5);
      v.branchR = Math.min(130, (v.branchR || 0) + 3.5);
      if (v.age % 2 === 0) {
        for (let bi = 0; bi < 3; bi++) {
          const bf = (bi + 1) / 3;
          state.particles.push({ x: v.cx - v.branchL * bf + (Math.random() - .5) * 10, y: v.gy - 180 - bi * 20, vx: -1 - Math.random(), vy: -Math.random() * 2, life: 25, ml: 25, color: Math.random() > .5 ? '#442211' : '#553311', size: 4 + Math.random() * 3, grav: 0.04, type: 'dust' });
          state.particles.push({ x: v.cx + v.branchR * bf + (Math.random() - .5) * 10, y: v.gy - 180 - bi * 20, vx: 1 + Math.random(), vy: -Math.random() * 2, life: 25, ml: 25, color: Math.random() > .5 ? '#442211' : '#553311', size: 4 + Math.random() * 3, grav: 0.04, type: 'dust' });
        }
        spawnP(v.cx - v.branchL + (Math.random() - .5) * 20, v.gy - 185 + Math.random() * 15, s.color, 2, 'sparkle');
        spawnP(v.cx + v.branchR + (Math.random() - .5) * 20, v.gy - 185 + Math.random() * 15, s.c2, 2, 'sparkle');
      }
      state.dynamicLights.push({ x: v.cx, y: v.gy - 180, r: 200 + v.branchL, color: s.color, int: 1.5, life: 2, ml: 2 });
      if (v.age > 55) { v.state = 4; v.age = 0; }

    } else if (v.state === 4) {
      // Canopy explosion + bloom + healing flood
      if (v.age === 1) {
        SoundFX.playSweep(500, 1200, 'sine', 1.5, 0.4);
        state.shake(15);
        spawnP(v.cx, v.gy - 200, s.core, 120, 'explode');
        spawnP(v.cx, v.gy - 200, s.c2, 80, 'burst');
        spawnP(v.cx, v.gy - 200, s.color, 60, 'sparkle');
        state.shockwaves.push({ x: v.cx, y: v.gy - 200, r: 0, maxR: 280, life: 35, maxLife: 35, color: s.core });
        state.dynamicLights.push({ x: v.cx, y: v.gy - 120, r: 500, color: s.core, int: 4, life: 18, ml: 18 });
        for (let k = 0; k < 30; k++) {
          const a = Math.random() * Math.PI * 2, spd = 3 + Math.random() * 5;
          state.particles.push({ x: v.cx, y: v.gy - 200, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3, life: 120, ml: 120, color: k % 3 === 0 ? '#ffaa44' : k % 3 === 1 ? '#ff6688' : s.core, size: 3 + Math.random() * 4, grav: .06, rot: Math.random() * 6, rotV: (Math.random() - .5) * .2, type: 'debris' });
        }
        state.player.inv = false;
      }
      if (v.age % 15 === 0) {
        state.shockwaves.push({ x: v.cx, y: v.gy - 100, r: 0, maxR: s.treeR + 30, life: 20, maxLife: 20, color: s.core });
        if (Math.hypot(state.player.x + state.player.w / 2 - v.cx, state.player.y + state.player.h / 2 - v.gy) < s.treeR) {
          state.player.hp = Math.min(100, state.player.hp + s.healAmt * 3);
          spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, s.core, 5, 'sparkle');
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.gy - 100, r: s.treeR * 1.5, color: s.core, int: 2, life: 2, ml: 2 });
      if (v.age > 60) { v.state = 5; v.age = 0; }

    } else if (v.state === 5) {
      // Mature tree: healing zone, falling leaves, root strikes
      if (v.age % 4 === 0) {
        const lc = Math.random() > .5 ? s.color : s.c2;
        state.particles.push({ x: v.cx + (Math.random() - .5) * 320, y: v.gy - 210 + (Math.random() - .5) * 40, vx: (Math.random() - .5) * 2 + 0.5, vy: 0.8 + Math.random(), life: 180, ml: 180, color: lc, size: 2 + Math.random() * 3, grav: .01, rot: Math.random() * 6, rotV: (Math.random() - .5) * .12, type: 'dust' });
      }
      if (v.age % 25 === 0) {
        if (Math.hypot(state.player.x + state.player.w / 2 - v.cx, state.player.y + state.player.h / 2 - v.gy) < s.treeR) {
          state.player.hp = Math.min(100, state.player.hp + s.healAmt);
          spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#88ffaa', 3, 'sparkle');
          SoundFX.playTone(900, 'sine', 0.08, 0.12);
        }
      }
      if (v.age % 50 === 0 && v.age < s.treeDur - 50) {
        for (let ri = 0; ri < 2; ri++) {
          state.shake(6); SoundFX.playNoise(0.25, 0.35, 200, 'lowpass');
          const rx = v.cx + (Math.random() - .5) * s.treeR * 2.2;
          state.spikes.push({ x: rx - 18, y: v.gy, w: 36, h: 0, maxH: 70, life: 100, maxLife: 100, dmg: s.dmg, color: '#442211', c2: '#664422', phase: 'rise' });
          spawnP(rx, v.gy, '#664422', 18, 'burst');
          for (const e of state.entities) {
            if (!e.active) continue;
            if (Math.hypot(e.x + e.w / 2 - rx, e.y + e.h / 2 - v.gy) < 55) { hurtEntity(e, s.dmg, rx, v.gy); e.vy -= 6 / (e.mass || 1); }
          }
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.gy - 100, r: s.treeR + 20, color: s.color, int: 1.2, life: 2, ml: 2 });
      if (v.age > s.treeDur) { v.state = 6; v.age = 0; }

    } else if (v.state === 6) {
      // Dissolve into golden motes
      if (v.age === 1) SoundFX.playSweep(600, 200, 'sine', 0.6, 0.5);
      if (v.age % 2 === 0) {
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2, rr = Math.random() * 180;
          state.particles.push({ x: v.cx + Math.cos(a) * rr, y: v.gy - 80 - Math.random() * 180, vx: Math.cos(a) * 0.5, vy: -0.5 - Math.random(), life: 80, ml: 80, color: k % 2 ? s.core : s.c2, size: 2 + Math.random() * 2, grav: -0.01, type: 'sparkle' });
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.gy - 100, r: Math.max(20, s.treeR * (1 - v.age / 60)), color: s.color, int: 1, life: 2, ml: 2 });
      if (v.age > 60) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
    }
  },
};

// ── VFX Draw Handlers ──────────────────────────────────────────────────────
// Each key matches a vfxSequence.type. Receives (v, X) where X is CanvasRenderingContext2D.
export const VFX_DRAW = {

  wooden_construct_anchor(v, X) {
    const s = v.spell;
    const pulse = 0.8 + Math.sin(performance.now() * 0.01) * 0.2;
    X.save();
    X.translate(v.cx, v.cy);
    X.globalAlpha = 0.15 * pulse;
    X.fillStyle = s.core;
    X.beginPath(); X.arc(0, 0, 22, 0, Math.PI * 2); X.fill();
    X.strokeStyle = s.c2; X.lineWidth = 1.5; X.globalAlpha = 0.55;
    X.setLineDash([4, 5]);
    X.beginPath(); X.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); X.stroke();
    X.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + performance.now() * 0.002;
      X.strokeStyle = i % 2 === 0 ? s.c2 : s.color;
      X.globalAlpha = 0.65;
      X.beginPath();
      X.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      X.quadraticCurveTo(Math.cos(a) * 10, Math.sin(a) * 8, Math.cos(a) * 16, Math.sin(a) * 12);
      X.stroke();
    }
    X.fillStyle = s.core; X.globalAlpha = 0.95;
    X.beginPath(); X.arc(0, 0, 3.5, 0, Math.PI * 2); X.fill();
    X.restore(); X.globalAlpha = 1;
  },

  wooden_construct(v, X) {
    const s = v.spell;
    const T = performance.now() * 0.0025;
    const living = v.segments.filter(seg => seg.placed && !seg.destroyed);
    X.save();

    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.globalAlpha = v.state === 0 ? 0.3 : 0.12;
    X.setLineDash([7, 5]);
    X.beginPath();
    const previewPts = v.state === 0 ? Math.max(2, Math.ceil(v.points.length * Math.max(v.buildProgress, 0.15))) : v.points.length;
    for (let i = 0; i < previewPts; i++) {
      const pt = v.points[Math.min(i, v.points.length - 1)];
      if (i === 0) X.moveTo(pt.x, pt.y);
      else X.lineTo(pt.x, pt.y);
    }
    if (v.state === 0 && v.head) X.lineTo(v.head.x, v.head.y);
    X.stroke();
    X.setLineDash([]);

    for (const seg of living) {
      const nx = Math.sin(seg.angle);
      const ny = -Math.cos(seg.angle);
      const sway = Math.sin(T * 1.7 + seg.swaySeed) * 2.8;

      for (let strand = 0; strand < 2; strand++) {
        const offset = (strand === 0 ? -1 : 1) * (seg.thickness * 0.22 + strand * 1.2);
        X.strokeStyle = strand === 0 ? s.color : s.c2;
        X.lineWidth = strand === 0 ? 1.8 : 1.1;
        X.globalAlpha = 0.48 + (v.damageFlash || 0) * 0.25;
        X.beginPath();
        X.moveTo(seg.a.x + nx * offset, seg.a.y + ny * offset);
        X.quadraticCurveTo(
          (seg.a.x + seg.b.x) * 0.5 + nx * sway,
          (seg.a.y + seg.b.y) * 0.5 + ny * sway,
          seg.b.x + nx * offset,
          seg.b.y + ny * offset
        );
        X.stroke();
      }

      X.fillStyle = '#76bb63';
      X.globalAlpha = 0.55;
      X.beginPath(); X.ellipse(seg.centerX + nx * 5, seg.centerY - ny * 4, 4, 1.8, seg.angle - 0.5, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.ellipse(seg.centerX - nx * 5, seg.centerY + ny * 4, 4, 1.8, seg.angle + 0.65, 0, Math.PI * 2); X.fill();
    }

    const anchors = [v.p1, v.p2];
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const pulse = 0.45 + Math.sin(T * 4 + i * 1.8) * 0.18 + (v.damageFlash || 0) * 0.3;
      X.globalAlpha = pulse;
      X.strokeStyle = i === 0 ? s.c2 : s.core;
      X.lineWidth = 1.4;
      X.beginPath(); X.arc(anchor.x, anchor.y, 8 + i, 0, Math.PI * 2); X.stroke();
      for (let root = 0; root < 3; root++) {
        const a = i === 0 ? Math.PI + root * 0.45 - 0.45 : root * 0.45 - 0.45;
        X.beginPath();
        X.moveTo(anchor.x, anchor.y);
        X.quadraticCurveTo(anchor.x + Math.cos(a) * 12, anchor.y + Math.sin(a) * 8, anchor.x + Math.cos(a) * 20, anchor.y + Math.sin(a) * 12);
        X.stroke();
      }
    }

    if (v.state === 0 && v.head) {
      X.globalAlpha = 0.45;
      X.fillStyle = s.core;
      X.beginPath(); X.arc(v.head.x, v.head.y, 9, 0, Math.PI * 2); X.fill();
      X.globalAlpha = 0.9;
      X.fillStyle = '#ffffff';
      X.beginPath(); X.arc(v.head.x, v.head.y, 3, 0, Math.PI * 2); X.fill();
    }

    X.restore(); X.globalAlpha = 1;
  },

  // Vine bridge: draw 3 wavy strands from player to target
  vine(v, X) {
    if (v.state !== 1 || !v.vinePts) return;
    const s = v.spell, t = performance.now() * 0.002;
    X.save();
    for (let si = 0; si < v.vinePts.length; si++) {
      const pts = v.vinePts[si];
      if (!pts || pts.length < 2) continue;
      const wave = Math.sin(t * 1.5 + si * 1.2) * 3;
      X.strokeStyle = si % 2 === 0 ? s.color : s.c2;
      X.lineWidth = 3 - si * 0.6;
      X.globalAlpha = 0.8 - si * 0.15;
      X.beginPath(); X.moveTo(pts[0].x, pts[0].y + wave);
      for (let pi = 1; pi < pts.length; pi++) {
        X.lineTo(pts[pi].x, pts[pi].y + wave * Math.sin(pi / pts.length * Math.PI));
      }
      X.stroke();
      if (si === 0) {
        for (let pi = 0; pi < pts.length; pi += 8) {
          X.fillStyle = s.c2; X.globalAlpha = 0.7;
          X.beginPath(); X.ellipse(pts[pi].x, pts[pi].y + wave * Math.sin(pi / pts.length * Math.PI), 4, 2, pi * 0.3, 0, Math.PI * 2); X.fill();
        }
      }
    }
    X.restore(); X.globalAlpha = 1;
  },

// World Tree: draw trunk, roots, branches, canopy — REALISTIC REVAMP
worldtree(v, X) {
    const s = v.spell;
    if (!v.gy) return;
    const gy = v.gy;
    const T = performance.now() * 0.001;

    // ── Helper: recursive branch with natural forking ──
    function drawBranch(x0, y0, len, angle, w, depth) {
        if (depth <= 0 || len < 5) return;
        const sw = Math.sin(T * 0.8 + angle * 2 + depth) * 0.03;
        const x1 = x0 + Math.cos(angle + sw) * len;
        const y1 = y0 + Math.sin(angle + sw) * len;
        const mx = (x0 + x1) / 2 + Math.sin(angle) * w * 1.5;
        const my = (y0 + y1) / 2 - Math.abs(Math.cos(angle)) * w;
        // Branch fill (tapered shape)
        const perpX = Math.sin(angle), perpY = -Math.cos(angle);
        X.fillStyle = depth > 2 ? '#3a2010' : depth > 1 ? '#4a2d15' : '#5a3a1e';
        X.beginPath();
        X.moveTo(x0 - perpX * w, y0 - perpY * w);
        X.quadraticCurveTo(mx - perpX * w * 0.7, my - perpY * w * 0.7, x1 - perpX * w * 0.3, y1 - perpY * w * 0.3);
        X.lineTo(x1 + perpX * w * 0.3, y1 + perpY * w * 0.3);
        X.quadraticCurveTo(mx + perpX * w * 0.7, my + perpY * w * 0.7, x0 + perpX * w, y0 + perpY * w);
        X.closePath(); X.fill();
        // Bark line
        if (w > 2) {
            X.strokeStyle = '#2a1508'; X.lineWidth = 0.6; X.globalAlpha *= 0.35;
            X.beginPath(); X.moveTo(x0, y0); X.quadraticCurveTo(mx, my, x1, y1); X.stroke();
            X.globalAlpha /= 0.35;
        }
        // Fork into 2 sub-branches at tip
        drawBranch(x1, y1, len * 0.62, angle - 0.4 + Math.sin(T * 0.5 + depth) * 0.04, w * 0.55, depth - 1);
        drawBranch(x1, y1, len * 0.58, angle + 0.35 + Math.cos(T * 0.5 + depth) * 0.04, w * 0.5, depth - 1);
        // Mid-branch fork on thicker branches
        if (depth > 2) {
            const t = 0.45;
            const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
            drawBranch(bx, by, len * 0.45, angle + (depth % 2 ? -0.6 : 0.6), w * 0.4, depth - 1);
        }
    }

    // ── Helper: foliage cluster ──
    function drawLeafCluster(cx, cy, r, c1, c2, cc, alpha, phase) {
        if (r < 2) return;
        const seg = 14;
        X.globalAlpha = alpha;
        const g = X.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.05, cx, cy, r);
        g.addColorStop(0, cc); g.addColorStop(0.35, c1); g.addColorStop(0.75, c2); g.addColorStop(1, 'rgba(0,30,0,0)');
        X.fillStyle = g;
        X.beginPath();
        for (let i = 0; i <= seg; i++) {
            const a = (i / seg) * Math.PI * 2;
            const n = 0.82 + Math.sin(a * 4.1 + phase) * 0.12 + Math.cos(a * 6.7 - phase * 0.6) * 0.08;
            const px = cx + Math.cos(a) * r * n;
            const py = cy + Math.sin(a) * r * 0.72 * n;
            i === 0 ? X.moveTo(px, py) : X.lineTo(px, py);
        }
        X.closePath(); X.fill();
        // Dappled light
        X.globalAlpha = alpha * 0.25;
        X.fillStyle = cc;
        for (let h = 0; h < 2; h++) {
            const ha = phase + h * 2.5;
            X.beginPath(); X.arc(cx + Math.cos(ha) * r * 0.35, cy + Math.sin(ha) * r * 0.25, r * 0.12, 0, Math.PI * 2); X.fill();
        }
    }

    // ═══════════ STATE 0: Summoning circle ═══════════
    if (v.state === 0) {
        const pr = Math.min(1, v.age / 50);
        X.save(); X.translate(v.cx, gy);
        // Triple rings
        X.strokeStyle = s.color; X.lineWidth = 2.5; X.globalAlpha = 0.4 * pr;
        X.beginPath(); X.ellipse(0, 0, 80 * pr, 26 * pr, 0, 0, Math.PI * 2); X.stroke();
        X.strokeStyle = s.c2; X.lineWidth = 1.8; X.globalAlpha = 0.6 * pr;
        X.beginPath(); X.ellipse(0, 0, 55 * pr, 18 * pr, 0, 0, Math.PI * 2); X.stroke();
        X.strokeStyle = s.core; X.lineWidth = 1; X.globalAlpha = 0.5 * pr;
        X.beginPath(); X.ellipse(0, 0, 30 * pr, 10 * pr, 0, 0, Math.PI * 2); X.stroke();
        // Rotating spokes
        for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2 + v.age * 0.04;
            X.strokeStyle = k % 3 === 0 ? s.core : s.c2;
            X.lineWidth = k % 3 === 0 ? 2 : 1;
            X.globalAlpha = (0.3 + Math.sin(v.age * 0.15 + k) * 0.2) * pr;
            X.beginPath(); X.moveTo(Math.cos(a) * 22 * pr, Math.sin(a) * 7 * pr);
            X.lineTo(Math.cos(a) * 78 * pr, Math.sin(a) * 25 * pr); X.stroke();
        }
        // Glyphs
        const glyphs = ['❋', '✦', '⚘', '✧', '❁', '⟡'];
        X.font = `${10 + pr * 4}px serif`; X.textAlign = 'center'; X.textBaseline = 'middle';
        for (let g = 0; g < 6; g++) {
            const ga = (g / 6) * Math.PI * 2 - v.age * 0.025, gr = 65 * pr;
            X.fillStyle = s.core; X.globalAlpha = (0.5 + Math.sin(v.age * 0.2 + g * 1.5) * 0.3) * pr;
            X.fillText(glyphs[g], Math.cos(ga) * gr, Math.sin(ga) * gr * 0.33);
        }
        // Center pulse
        const pulse = 0.7 + Math.sin(v.age * 0.15) * 0.3;
        X.fillStyle = s.core; X.globalAlpha = 0.6 * pr * pulse;
        X.beginPath(); X.arc(0, 0, 5 * pr, 0, Math.PI * 2); X.fill();
        const sg = X.createRadialGradient(0, 0, 0, 0, 0, 18 * pr);
        sg.addColorStop(0, s.core); sg.addColorStop(1, 'transparent');
        X.fillStyle = sg; X.globalAlpha = 0.3 * pr * pulse;
        X.beginPath(); X.arc(0, 0, 18 * pr, 0, Math.PI * 2); X.fill();
        // Cracks
        X.strokeStyle = s.c2; X.lineWidth = 1; X.globalAlpha = 0.3 * pr;
        for (let c = 0; c < 8; c++) {
            const ca = (c / 8) * Math.PI * 2 + 0.2, cl = (30 + c * 7) * pr;
            X.beginPath();
            X.moveTo(Math.cos(ca) * 10 * pr, Math.sin(ca) * 3 * pr);
            X.lineTo(Math.cos(ca) * cl, Math.sin(ca) * cl * 0.33 + 2); X.stroke();
        }
        X.restore(); X.globalAlpha = 1;
        return;
    }

    // ═══════════ STATES 1-6: Full tree ═══════════
    const treeAlpha = v.state === 6 ? Math.max(0, 1 - v.age / 60) : 0.95;
    const trunkH = v.state <= 2 ? Math.min(220, v.age * (v.state === 1 ? 5 : 5.5)) : 220;
    X.save(); X.translate(v.cx, gy);
    X.globalAlpha = treeAlpha;

    // ── Light rays (states 4+) ──
    if (v.state >= 4 && trunkH >= 200) {
        const rA = v.state === 6 ? Math.max(0, 0.12 * (1 - v.age / 60)) : 0.12;
        X.globalAlpha = rA * treeAlpha;
        for (let r = 0; r < 7; r++) {
            const ra = -Math.PI * 0.82 + (r / 6) * Math.PI * 0.64 + Math.sin(T * 0.3 + r) * 0.04;
            const rL = 260 + Math.sin(T * 0.5 + r * 1.7) * 35;
            const rW = 10 + Math.sin(T * 0.8 + r * 2.3) * 4;
            const rg = X.createLinearGradient(0, -trunkH - 40, Math.cos(ra) * rL, -trunkH - 40 + Math.sin(ra) * rL);
            rg.addColorStop(0, s.core); rg.addColorStop(0.25, s.c2); rg.addColorStop(1, 'transparent');
            X.fillStyle = rg;
            X.beginPath();
            X.moveTo(0, -trunkH - 40);
            X.lineTo(Math.cos(ra) * rL + Math.sin(ra) * rW, -trunkH - 40 + Math.sin(ra) * rL - Math.cos(ra) * rW);
            X.lineTo(Math.cos(ra) * rL - Math.sin(ra) * rW, -trunkH - 40 + Math.sin(ra) * rL + Math.cos(ra) * rW);
            X.closePath(); X.fill();
        }
        X.globalAlpha = treeAlpha;
    }

    // ── Realistic buttress roots ──
    if (v.state >= 1) {
        const rGrow = v.state <= 2 ? Math.min(1, v.age / 45) : 1;
        X.globalAlpha = treeAlpha;
        // Roots are drawn as filled shapes that flare from the trunk base and hug the ground
        const rootData = [
            { dir: -1, spreadX: 95, peakY: -30, baseW: 18, tipW: 3 },
            { dir: 1, spreadX: 90, peakY: -28, baseW: 17, tipW: 3 },
            { dir: -1, spreadX: 65, peakY: -22, baseW: 14, tipW: 2.5 },
            { dir: 1, spreadX: 70, peakY: -24, baseW: 15, tipW: 2.5 },
            { dir: -1, spreadX: 110, peakY: -18, baseW: 10, tipW: 2 },
            { dir: 1, spreadX: 105, peakY: -16, baseW: 10, tipW: 2 },
        ];
        for (const rd of rootData) {
            const sx = rd.spreadX * rGrow * rd.dir;
            const py = rd.peakY * rGrow;
            // Root body — filled organic shape
            const rg = X.createLinearGradient(0, 0, sx, 0);
            rg.addColorStop(0, '#4a2a0e'); rg.addColorStop(0.5, '#3d2210'); rg.addColorStop(1, '#2d1a0b');
            X.fillStyle = rg;
            X.beginPath();
            // Top edge of root (arches up from trunk then curves to ground)
            X.moveTo(rd.dir * 8, -rd.baseW * 0.5);
            X.bezierCurveTo(sx * 0.25, py - 4, sx * 0.55, py * 0.6, sx, -rd.tipW);
            // Tip
            X.lineTo(sx + rd.dir * 5, 2);
            // Bottom edge (follows ground)
            X.bezierCurveTo(sx * 0.6, 5, sx * 0.3, 4, rd.dir * 12, 3);
            X.closePath(); X.fill();
            // Ridge highlight
            X.strokeStyle = '#5a3a1e'; X.lineWidth = 1.2; X.globalAlpha = treeAlpha * 0.3;
            X.beginPath();
            X.moveTo(rd.dir * 10, -rd.baseW * 0.3);
            X.bezierCurveTo(sx * 0.3, py + 2, sx * 0.6, py * 0.5 + 2, sx * 0.85, -1);
            X.stroke();
            X.globalAlpha = treeAlpha;
            // Small sub-root branching off
            if (Math.abs(rd.spreadX) > 60) {
                const subX = sx * 0.65, subEndX = sx * 0.65 + rd.dir * 25;
                X.fillStyle = '#3a2010';
                X.beginPath();
                X.moveTo(subX, py * 0.5 + 1);
                X.quadraticCurveTo(subX + rd.dir * 12, py * 0.3 - 3, subEndX, 1);
                X.lineTo(subEndX, 4);
                X.quadraticCurveTo(subX + rd.dir * 10, py * 0.3 + 3, subX, py * 0.5 + 5);
                X.closePath(); X.fill();
            }
        }
    }

    // ── Trunk with bark texture ──
    if (trunkH > 5) {
        const baseW = 24, topW = 9, midW = 17;
        X.globalAlpha = treeAlpha;
        const tg = X.createLinearGradient(-5, 0, 5, -trunkH);
        tg.addColorStop(0, '#4a2a0e'); tg.addColorStop(0.15, '#503015');
        tg.addColorStop(0.4, '#442211'); tg.addColorStop(0.7, '#3a2810');
        tg.addColorStop(1, '#2d3318');
        X.fillStyle = tg;
        X.beginPath();
        X.moveTo(-baseW, 0);
        X.bezierCurveTo(-baseW + 1, -trunkH * 0.2, -midW - 3, -trunkH * 0.4, -midW, -trunkH * 0.5);
        X.bezierCurveTo(-midW + 2, -trunkH * 0.65, -topW - 2, -trunkH * 0.85, -topW, -trunkH);
        X.lineTo(topW, -trunkH);
        X.bezierCurveTo(topW + 2, -trunkH * 0.85, midW - 2, -trunkH * 0.65, midW, -trunkH * 0.5);
        X.bezierCurveTo(midW + 3, -trunkH * 0.4, baseW - 1, -trunkH * 0.2, baseW, 0);
        X.closePath(); X.fill();

        // Bark texture — vertical grain lines
        X.globalAlpha = treeAlpha * 0.3;
        for (let bl = 0; bl < 14; bl++) {
            const t = bl / 14;
            const by = -trunkH * t;
            const w = baseW - (baseW - topW) * t;
            const bx = (bl % 3 - 1) * w * 0.3 + Math.sin(bl * 2.1) * 3;
            X.strokeStyle = bl % 2 ? '#2a1508' : '#4a3018';
            X.lineWidth = 0.5 + (1 - t) * 0.5;
            X.beginPath();
            X.moveTo(bx, by - 2);
            X.bezierCurveTo(bx + 1, by - 10, bx - 1, by - 18, bx + 0.5, by - 25);
            X.stroke();
        }

        // Knotholes
        X.globalAlpha = treeAlpha * 0.55;
        const knots = [{ y: -trunkH * 0.28, x: -5, r: 4.5 }, { y: -trunkH * 0.58, x: 4, r: 3.5 }];
        for (const kn of knots) {
            if (-kn.y > trunkH) continue;
            const kg = X.createRadialGradient(kn.x, kn.y, 0, kn.x, kn.y, kn.r);
            kg.addColorStop(0, '#0f0905'); kg.addColorStop(0.5, '#1f150a'); kg.addColorStop(1, '#3a2810');
            X.fillStyle = kg;
            X.beginPath(); X.ellipse(kn.x, kn.y, kn.r, kn.r * 1.4, 0.15, 0, Math.PI * 2); X.fill();
            X.strokeStyle = '#2a1a0a'; X.lineWidth = 0.7;
            X.beginPath(); X.ellipse(kn.x, kn.y, kn.r + 1, kn.r * 1.4 + 1, 0.15, 0, Math.PI * 2); X.stroke();
        }

        // Moss patches
        X.globalAlpha = treeAlpha * 0.25; X.fillStyle = '#2a6633';
        [{ x: -baseW + 5, y: -18, r: 6 }, { x: midW - 9, y: -trunkH * 0.45, r: 5 }].forEach(m => {
            if (-m.y > trunkH) return;
            X.beginPath(); X.ellipse(m.x, m.y, m.r, m.r * 1.4, 0.2, 0, Math.PI * 2); X.fill();
        });
        X.globalAlpha = treeAlpha;

        // Glowing rune (states 4+)
        if (v.state >= 4) {
            const glow = 0.3 + Math.sin(T * 2) * 0.15;
            X.strokeStyle = s.core; X.lineWidth = 1.5; X.globalAlpha = treeAlpha * glow;
            const ry = -trunkH * 0.32;
            X.beginPath();
            X.moveTo(0, ry - 8); X.lineTo(-6, ry); X.moveTo(0, ry - 8); X.lineTo(6, ry);
            X.moveTo(0, ry - 8); X.lineTo(0, ry + 6); X.moveTo(-5, ry - 2); X.lineTo(5, ry - 2);
            X.stroke();
            const rg2 = X.createRadialGradient(0, ry, 0, 0, ry, 14);
            rg2.addColorStop(0, s.core); rg2.addColorStop(1, 'transparent');
            X.fillStyle = rg2; X.globalAlpha = treeAlpha * glow * 0.4;
            X.beginPath(); X.arc(0, ry, 14, 0, Math.PI * 2); X.fill();
        }
    }

    // ── Branches (state >= 3) ──
    if (v.state >= 3) {
        const bp = v.state === 3 ? Math.min(1, v.age / 55) : 1;
        X.globalAlpha = treeAlpha;
        const brs = [
            { x: -4, y: -trunkH + 8, l: 90, a: -Math.PI * 0.65, w: 7, d: 3 },
            { x: 4, y: -trunkH + 8, l: 85, a: -Math.PI * 0.35, w: 7, d: 3 },
            { x: -6, y: -trunkH + 28, l: 70, a: -Math.PI * 0.78, w: 5.5, d: 3 },
            { x: 6, y: -trunkH + 28, l: 65, a: -Math.PI * 0.22, w: 5.5, d: 3 },
            { x: 0, y: -trunkH + 4, l: 55, a: -Math.PI * 0.5, w: 4.5, d: 2 },
            { x: -7, y: -trunkH + 48, l: 50, a: -Math.PI * 0.88, w: 4, d: 2 },
            { x: 7, y: -trunkH + 48, l: 45, a: -Math.PI * 0.12, w: 4, d: 2 },
        ];
        for (const b of brs) drawBranch(b.x, b.y, b.l * bp, b.a, b.w, b.d);
    }

    // ── Canopy (state >= 4) ──
    if (v.state >= 4 && trunkH >= 200) {
        const cp = v.state === 4 ? Math.min(1, v.age / 40) : 1;
        const cf = v.state === 6 ? Math.max(0, 1 - v.age / 60) : 1;
        // Back layer
        [[-75, -65, 60], [70, -58, 55], [0, -95, 65], [-45, -88, 50], [50, -82, 48], [-25, -32, 42], [30, -38, 44]].forEach(([x, y, r]) =>
            drawLeafCluster(x, y - trunkH, r * cp * cf, '#0a3318', '#0d4420', '#1a6633', treeAlpha * 0.45, T * 0.8 + x * 0.1));
        // Mid layer
        [[-60, -52, 52], [55, -47, 50], [-18, -78, 55], [22, -72, 52], [0, -58, 48], [-85, -30, 38], [80, -28, 36], [-40, -72, 40], [45, -68, 38]].forEach(([x, y, r]) =>
            drawLeafCluster(x, y - trunkH, r * cp * cf, s.color, s.c2, s.core, treeAlpha * 0.6, T + x * 0.05));
        // Front layer
        [[-50, -42, 32], [42, -40, 30], [-8, -68, 35], [12, -62, 33], [-70, -22, 25], [65, -20, 24]].forEach(([x, y, r]) =>
            drawLeafCluster(x, y - trunkH, r * cp * cf, '#2a8844', '#44bb66', '#77ee99', treeAlpha * 0.4, T * 1.2 + y * 0.04));
        // Flowers
        if (v.state >= 5) {
            X.globalAlpha = treeAlpha * cf * 0.65;
            const fc = ['#ffaa44', '#ff6688', '#ffdd66', '#ff88bb', '#ffcc88'];
            for (let f = 0; f < 12; f++) {
                const fa = f * 2.4 + T * 0.2, fr = 45 + (f % 3) * 22;
                X.fillStyle = fc[f % 5];
                X.beginPath(); X.arc(Math.cos(fa) * fr, -trunkH - 55 + Math.sin(fa) * fr * 0.45,
                    2.5 + Math.sin(T * 2 + f) * 0.7, 0, Math.PI * 2); X.fill();
            }
        }
    }

    // ── Fireflies (state >= 4) ──
    if (v.state >= 4) {
        for (let ff = 0; ff < 8; ff++) {
            const freq = 0.25 + ff * 0.08;
            const ffx = Math.sin(T * freq + ff * 1.8) * 130;
            const ffy = -trunkH * 0.5 + Math.cos(T * freq * 0.7 + ff * 2.5) * 90 - 30;
            const br = 0.5 + Math.sin(T * 3 + ff * 4) * 0.5;
            if (br > 0.3) {
                const fr = 2 + br * 1.5;
                const fg = X.createRadialGradient(ffx, ffy, 0, ffx, ffy, fr * 4);
                fg.addColorStop(0, s.core); fg.addColorStop(1, 'transparent');
                X.fillStyle = fg; X.globalAlpha = treeAlpha * br * 0.3;
                X.beginPath(); X.arc(ffx, ffy, fr * 4, 0, Math.PI * 2); X.fill();
                X.fillStyle = '#ffffcc'; X.globalAlpha = treeAlpha * br * 0.75;
                X.beginPath(); X.arc(ffx, ffy, fr * 0.5, 0, Math.PI * 2); X.fill();
            }
        }
    }

    // ── Healing aura (state 5) ──
    if (v.state === 5) {
        const ap = Math.sin(T * 1.5) * 0.08 + 0.92;
        const aR = s.treeR * ap;
        X.strokeStyle = s.core; X.lineWidth = 2;
        X.globalAlpha = treeAlpha * (0.13 + Math.sin(T * 1.5) * 0.07);
        X.setLineDash([8, 12]);
        X.beginPath(); X.arc(0, -trunkH * 0.3, aR, 0, Math.PI * 2); X.stroke();
        X.setLineDash([]);
        X.strokeStyle = s.c2; X.lineWidth = 1; X.globalAlpha = treeAlpha * 0.08;
        X.beginPath(); X.arc(0, -trunkH * 0.3, aR * 0.85, 0, Math.PI * 2); X.stroke();
        // Orbiting symbols
        X.font = '10px serif'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = s.core;
        ['✦', '⚘', '❋', '✧'].forEach((sym, i) => {
            const sa = (i / 4) * Math.PI * 2 + T * 0.4;
            X.globalAlpha = treeAlpha * (0.35 + Math.sin(T * 2 + i * 1.5) * 0.2);
            X.fillText(sym, Math.cos(sa) * aR, -trunkH * 0.3 + Math.sin(sa) * aR);
        });
    }

    X.restore(); X.globalAlpha = 1;
},
};
