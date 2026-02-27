// ═══════════════════════════════════════════════════════════════════════════
// chrono.js — Time & Chrono Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
  // 1. Temporal Echo — projectile that leaves delayed damage afterimages
  {
    name: 'Temporal Echo', icon: '🔄', key: 'Z', color: '#44ccdd', c2: '#88eeff',
    core: '#ccffff', speed: 11, dmg: 14, mana: 12, cd: 300, r: 5, grav: 0,
    drag: .998, bounce: 1, exR: 20, exF: 3, trail: 'chrono',
    isEcho: true, echoInterval: 8, echoDmg: 8, echoDelay: 40,
    desc: 'Leaves afterimages that replay damage'
  },

  // 2. Rewind Bolt — reverses enemy velocity on hit, sends them flying back
  {
    name: 'Rewind Bolt', icon: '⏪', key: 'V', color: '#66aaff', c2: '#99ccff',
    core: '#ccddff', speed: 14, dmg: 18, mana: 10, cd: 250, r: 4, grav: 0,
    drag: 1, bounce: 0, exR: 30, exF: 6, trail: 'chrono',
    isRewind: true, rewindForce: 2.5,
    desc: 'Reverses enemy momentum on hit'
  },

  // 3. Phase Shift — player blinks forward leaving a damaging ghost trail
  {
    name: 'Phase Shift', icon: '👤', key: 'B', color: '#aabbff', c2: '#ccddff',
    core: '#eeeeff', speed: 0, dmg: 30, mana: 18, cd: 500, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'phase',
    isPhaseShift: true, phaseRange: 200, phaseDmg: 12,
    desc: 'Dash forward — ghost trail damages all'
  },

  // 4. Paradox Mine — invisible mines that freeze enemies in time bubbles
  {
    name: 'Paradox Mine', icon: '⏱️', key: 'G', color: '#9988dd', c2: '#bbaaff',
    core: '#ddccff', speed: 6, dmg: 0, mana: 15, cd: 400, r: 5, grav: .08,
    drag: .98, bounce: 0, exR: 0, exF: 0, trail: 'chrono',
    isMine: true, mineR: 55, mineDur: 600, mineFreeze: 120,
    desc: 'Invisible mine — freezes enemies in time'
  },

  // 5. Haste Zone — creates an acceleration field for the player
  {
    name: 'Haste Zone', icon: '⚡', key: 'H', color: '#ffcc44', c2: '#ffee88',
    core: '#ffffcc', speed: 0, dmg: 0, mana: 25, cd: 800, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'haste',
    isHasteZone: true, hasteR: 100, hasteDur: 360, hasteMult: 1.8,
    desc: 'Creates a speed boost zone'
  },

  // 6. Entropy Cascade — chain-reaction decay that jumps between enemies
  {
    name: 'Entropy Cascade', icon: '🧬', key: 'J', color: '#cc8844', c2: '#eeaa66',
    core: '#ffcc88', speed: 9, dmg: 15, mana: 22, cd: 600, r: 6, grav: 0,
    drag: .99, bounce: 0, exR: 25, exF: 2, trail: 'entropy',
    isCascade: true, cascadeJumps: 5, cascadeDmg: 10, cascadeR: 120,
    desc: 'Decay chains between enemies'
  },

  // 7. Temporal Rift — opens a portal pair, projectiles entering one exit the other
  {
    name: 'Temporal Rift', icon: '🌀', key: 'U', color: '#ff66cc', c2: '#ff99dd',
    core: '#ffccee', speed: 0, dmg: 0, mana: 30, cd: 1000, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'rift',
    isRift: true, riftDur: 480, riftR: 40,
    desc: 'Opens portal pair — redirects projectiles'
  },

  // 8. Age Decay — projectile that shrinks enemies on hit, weakening them
  {
    name: 'Age Decay', icon: '💀', key: 'I', color: '#aa7744', c2: '#cc9966',
    core: '#eebb88', speed: 7, dmg: 10, mana: 14, cd: 350, r: 7, grav: .02,
    drag: .99, bounce: 0, exR: 35, exF: 3, trail: 'entropy',
    isAgeDecay: true, shrinkAmt: 0.7, shrinkDur: 300,
    desc: 'Ages enemies — shrinks and weakens'
  },

  // 9. Déjà Vu — marks a snapshot; recast replays all damage dealt since
  {
    name: 'Déjà Vu', icon: '🔁', key: 'Y', color: '#ddaa44', c2: '#ffcc66',
    core: '#ffee99', speed: 10, dmg: 5, mana: 20, cd: 700, r: 6, grav: 0,
    drag: .99, bounce: 0, exR: 40, exF: 5, trail: 'chrono',
    isDejaVu: true, dejaR: 80, dejaDur: 180,
    desc: 'Marks enemy — replays all damage after delay'
  },

  createManifestSpell({
    name: 'Delay Track', icon: '🕰️',
    color: '#6fcfff', c2: '#fff0a8', core: '#ffffff',
    manifestStyle: 'chrono', manifestEffect: 'chrono_slow', manifestProfile: 'track', manifestGlyph: ':',
    manifestSolid: false, manifestDuration: 600,
    mana: 24, cd: 900, manifestArc: 14, manifestThickness: 20, manifestSegmentHp: 18, manifestBuildRate: 0.06,
    desc: 'Manifest a temporal track that slows motion without becoming a full bridge'
  }),

  // 10. CHRONO BREAK (ULTIMATE) — stops time, places damage, resumes with explosion
  {
    name: 'Chrono Break', icon: '⏳', key: 'M', color: '#4466ff', c2: '#6688ff',
    core: '#99bbff', speed: 0, dmg: 80, mana: 85, cd: 8000, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'chrono',
    isChronoBreak: true, breakR: 300, breakStrikes: 12,
    desc: 'Stops time — rains destruction (Ultimate)'
  },
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  ...MANIFEST_FIRE_HANDLERS,
  isPhaseShift(s, ox, oy, tx, ty) {
    const angle = Math.atan2(ty - oy, tx - ox);
    state.vfxSequences.push({
      type: 'phase-shift', state: 0, age: 0,
      fx: state.player.x + state.player.w / 2,
      fy: state.player.y + state.player.h / 2,
      angle, spell: s
    });
    state.player.inv = true;
    return true;
  },

  isHasteZone(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'haste-zone', state: 0, age: 0, cx: tx, cy: ty, spell: s
    });
    return true;
  },

  isRift(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'temporal-rift', state: 0, age: 0,
      p1x: ox, p1y: oy, p2x: tx, p2y: ty, spell: s
    });
    return true;
  },

  isChronoBreak(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'chrono-break', state: 0, age: 0,
      cx: state.player.x + state.player.w / 2,
      cy: state.player.y + state.player.h / 2,
      spell: s, strikes: [], savedEntities: []
    });
    state.player.inv = true;
    return true;
  },
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
export const PROJ_HOOKS = {

  // Temporal Echo — drops afterimage ghosts along flight path
  isEcho: {
    onUpdate(p, s) {
      if (p.age % s.echoInterval === 0 && p.age > 0) {
        // Store an afterimage that will detonate later
        state.vfxSequences.push({
          type: 'echo-ghost', state: 0, age: 0,
          cx: p.x, cy: p.y, spell: s, delay: s.echoDelay
        });
      }
    },
    onLand(p, s) {
      // Final echo at impact
      state.vfxSequences.push({
        type: 'echo-ghost', state: 0, age: 0,
        cx: p.x, cy: p.y, spell: s, delay: 15
      });
      spawnP(p.x, p.y, s.core, 12, 'burst');
      state.dynamicLights.push({ x: p.x, y: p.y, r: 50, color: s.core, int: 2, life: 8, ml: 8 });
    },
  },

  // Rewind Bolt — reverses entity momentum on hit + strong directional push
  isRewind: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && hitEntity.active) {
        // Calculate push direction — OPPOSITE of projectile travel
        const projAngle = Math.atan2(p.vy, p.vx);
        const reverseAngle = projAngle + Math.PI; // opposite direction
        const pushForce = s.speed * s.rewindForce; // strong push based on spell speed
        // Apply strong reverse push (always significant, regardless of enemy's current velocity)
        hitEntity.vx = Math.cos(reverseAngle) * pushForce;
        hitEntity.vy = Math.sin(reverseAngle) * pushForce - 6;
        if (hitEntity.rotV !== undefined) hitEntity.rotV = (Math.random() - .5) * 3;
        // Cinematic rewind flash
        SoundFX.playSweep(800, 200, 'sine', 0.5, 0.3);
        SoundFX.playSweep(400, 100, 'sawtooth', 0.3, 0.2);
        spawnP(p.x, p.y, s.core, 25, 'burst');
        spawnP(p.x, p.y, s.c2, 12, 'sparkle');
        state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: 70, life: 12, maxLife: 12, color: s.core });
        state.dynamicLights.push({ x: p.x, y: p.y, r: 90, color: s.core, int: 3, life: 8, ml: 8 });
        state.shake(8);
        // Rewind visual — particles in reverse direction
        for (let k = 0; k < 12; k++) {
          const a = reverseAngle + (Math.random() - .5) * 1.2;
          state.particles.push({
            x: p.x, y: p.y, vx: Math.cos(a) * (4 + Math.random() * 4), vy: Math.sin(a) * (4 + Math.random() * 4),
            life: 25, ml: 25, color: k % 2 ? s.color : s.c2,
            size: 3 + Math.random() * 2, grav: 0, type: 'trail'
          });
        }
        // Clock rewind particle spiral
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          state.particles.push({
            x: p.x + Math.cos(a) * 15, y: p.y + Math.sin(a) * 15,
            vx: Math.cos(a - 1.5) * 3, vy: Math.sin(a - 1.5) * 3,
            life: 20, ml: 20, color: s.core,
            size: 2, grav: 0, type: 'sparkle'
          });
        }
      } else {
        // Hit platform — temporal distortion ring
        spawnP(p.x, p.y, s.color, 10, 'burst');
        state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: 45, life: 10, maxLife: 10, color: s.color });
        state.dynamicLights.push({ x: p.x, y: p.y, r: 40, color: s.core, int: 1.5, life: 5, ml: 5 });
      }
    },
  },

  // Paradox Mine — sticks to surfaces, becomes invisible, triggers on proximity
  isMine: {
    onUpdate(p, s) {
      // Slow down and plant
      if (p.age > 15) {
        p.vx *= 0.85; p.vy *= 0.85;
      }
      if (p.age > 30 || Math.hypot(p.vx, p.vy) < 0.5) {
        // Plant the mine as a VFX
        state.vfxSequences.push({
          type: 'paradox-mine', state: 0, age: 0,
          cx: p.x, cy: p.y, spell: s
        });
        spawnP(p.x, p.y, s.core, 6, 'sparkle');
        SoundFX.playTone(600, 'sine', 0.15, 0.1);
        return true; // remove projectile
      }
    },
  },

  // Entropy Cascade — on hit, starts chain reaction
  isCascade: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && hitEntity.active) {
        state.vfxSequences.push({
          type: 'entropy-cascade', state: 0, age: 0,
          cx: hitEntity.x + hitEntity.w / 2,
          cy: hitEntity.y + hitEntity.h / 2,
          jumps: s.cascadeJumps, spell: s, hitList: [hitEntity]
        });
      }
      spawnP(p.x, p.y, s.color, 10, 'burst');
      state.dynamicLights.push({ x: p.x, y: p.y, r: 40, color: s.core, int: 1.5, life: 6, ml: 6 });
    },
  },

  // Age Decay — shrinks enemy on hit
  isAgeDecay: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && hitEntity.active) {
        // Apply shrink debuff
        if (!hitEntity._shrunk) {
          hitEntity._origW = hitEntity.w;
          hitEntity._origH = hitEntity.h;
        }
        hitEntity._shrunk = true;
        hitEntity._shrinkTimer = s.shrinkDur;
        hitEntity.w = Math.max(8, (hitEntity._origW || hitEntity.w) * s.shrinkAmt);
        hitEntity.h = Math.max(8, (hitEntity._origH || hitEntity.h) * s.shrinkAmt);
        // Weaken — reduce mass
        if (hitEntity.mass) hitEntity.mass *= 0.6;

        SoundFX.playSweep(500, 200, 'sawtooth', 0.3, 0.4);
        spawnP(p.x, p.y, s.color, 15, 'void');
        spawnP(p.x, p.y, s.core, 8, 'sparkle');
        state.dynamicLights.push({ x: p.x, y: p.y, r: 60, color: s.color, int: 2, life: 8, ml: 8 });
        state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: 45, life: 12, maxLife: 12, color: s.color });
        state.shake(4);

        // Aging dust particles falling off
        for (let k = 0; k < 12; k++) {
          state.particles.push({
            x: p.x + (Math.random() - .5) * 20, y: p.y + (Math.random() - .5) * 20,
            vx: (Math.random() - .5) * 3, vy: Math.random() * 2 + 1,
            life: 40, ml: 40, color: k % 2 ? '#886644' : '#aa9966',
            size: 2 + Math.random() * 3, grav: 0.1, type: 'dust',
            rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.3,
          });
        }
      }
    },
  },

  // Déjà Vu — marks an enemy for delayed damage replay
  isDejaVu: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && hitEntity.active) {
        state.vfxSequences.push({
          type: 'deja-vu', state: 0, age: 0,
          target: hitEntity, spell: s, storedDmg: 0
        });
        SoundFX.playTone(440, 'sine', 0.3, 0.2);
        SoundFX.playTone(660, 'sine', 0.2, 0.15);
      }
      spawnP(p.x, p.y, s.core, 10, 'burst');
      state.dynamicLights.push({ x: p.x, y: p.y, r: 50, color: s.core, int: 2, life: 6, ml: 6 });
    },
  },
};

// ── Trail Particle Emitters ────────────────────────────────────────────────
export const TRAIL_EMITTERS = {
  chrono(p, s) {
    // Clock-like spinning particles
    const a = p.age * 0.3;
    state.particles.push({
      x: p.x + Math.cos(a) * 4, y: p.y + Math.sin(a) * 4,
      vx: (Math.random() - .5) * 1, vy: (Math.random() - .5) * 1,
      life: 15, ml: 15, color: Math.random() > .5 ? s.color : s.c2,
      size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
    });
    if (p.age % 5 === 0) spawnP(p.x, p.y, s.core, 1, 'trail');
  },

  phase(p, s) {
    // Ghost afterimage dissolving
    state.particles.push({
      x: p.x + (Math.random() - .5) * 10, y: p.y + (Math.random() - .5) * 10,
      vx: 0, vy: -0.5, life: 20, ml: 20,
      color: Math.random() > .5 ? s.color : '#ffffff',
      size: 3 + Math.random() * 3, grav: -0.02, type: 'smoke'
    });
  },

  entropy(p, s) {
    // Decaying particles that crumble
    if (p.age % 2 === 0) {
      state.particles.push({
        x: p.x + (Math.random() - .5) * 8, y: p.y + (Math.random() - .5) * 8,
        vx: (Math.random() - .5) * 2, vy: Math.random() * 1.5,
        life: 18, ml: 18, color: Math.random() > .5 ? s.color : '#886644',
        size: 2 + Math.random() * 2, grav: 0.08, type: 'dust',
        rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.2,
      });
    }
    if (p.age % 4 === 0) spawnP(p.x, p.y, s.core, 1, 'sparkle');
  },

  haste(p, s) {
    // Speed lines trailing behind
    const a = Math.atan2(p.vy, p.vx) + Math.PI;
    for (let k = 0; k < 2; k++) {
      state.particles.push({
        x: p.x + Math.cos(a + (Math.random() - .5) * 0.5) * 6,
        y: p.y + Math.sin(a + (Math.random() - .5) * 0.5) * 6,
        vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
        life: 10, ml: 10, color: s.core,
        size: 1 + Math.random() * 2, grav: 0, type: 'trail'
      });
    }
  },

  rift(p, s) {
    // Dimensional distortion particles
    const a = Math.random() * Math.PI * 2;
    state.particles.push({
      x: p.x + Math.cos(a) * 6, y: p.y + Math.sin(a) * 6,
      vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5,
      life: 12, ml: 12, color: Math.random() > .5 ? s.color : s.c2,
      size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
    });
  },
};

// ── VFX Update Handlers ────────────────────────────────────────────────────
export const VFX_UPDATE = {
  ...MANIFEST_VFX_UPDATE,

  // ─── ECHO GHOST — delayed afterimage detonation ───
  'echo-ghost'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Waiting phase — ghost pulsing
      if (v.age % 4 === 0) {
        state.particles.push({
          x: v.cx + (Math.random() - .5) * 12, y: v.cy + (Math.random() - .5) * 12,
          vx: 0, vy: -0.3, life: 15, ml: 15, color: s.c2,
          size: 2 + Math.random() * 2, grav: -0.01, type: 'sparkle'
        });
      }
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: 20 + Math.sin(v.age * 0.3) * 5,
        color: s.color, int: 0.4 + Math.sin(v.age * 0.2) * 0.2, life: 2, ml: 2
      });
      if (v.age > v.delay) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      // Detonate — damage and flash
      if (v.age === 1) {
        SoundFX.playTone(800, 'sine', 0.2, 0.1);
        SoundFX.playTone(1200, 'sine', 0.15, 0.08);
        spawnP(v.cx, v.cy, s.core, 10, 'burst');
        spawnP(v.cx, v.cy, s.c2, 6, 'sparkle');
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 35, life: 8, maxLife: 8, color: s.core });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 50, color: s.core, int: 2, life: 5, ml: 5 });
        state.shake(2);
        // Hurt entities in small radius
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < 30) {
            hurtEntity(e, s.echoDmg, v.cx, v.cy);
          }
        }
      }
      if (v.age > 10) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── PHASE SHIFT — player dashes leaving ghost trail ───
  'phase-shift'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Wind-up flash
      if (v.age === 1) {
        SoundFX.playSweep(200, 1200, 'sine', 0.5, 0.15);
        state.player.castAnim = 60; state.player.castType = 'front_pose';
        spawnP(v.fx, v.fy, s.core, 15, 'burst');
        state.dynamicLights.push({ x: v.fx, y: v.fy, r: 80, color: s.core, int: 2, life: 4, ml: 4 });
      }
      if (v.age > 5) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      // Dash — move player along angle, damage along path
      if (v.age === 1) {
        SoundFX.playSweep(600, 1800, 'sine', 0.6, 0.2);
        SoundFX.playNoise(0.3, 0.15, 800, 'highpass');
        v.startX = state.player.x + state.player.w / 2;
        v.startY = state.player.y + state.player.h / 2;
      }
      const progress = Math.min(1, v.age / 8);
      const targetX = v.fx + Math.cos(v.angle) * s.phaseRange;
      const targetY = v.fy + Math.sin(v.angle) * s.phaseRange;
      state.player.x = v.fx + (targetX - v.fx) * progress - state.player.w / 2;
      state.player.y = v.fy + (targetY - v.fy) * progress - state.player.h / 2;
      state.player.vx = 0; state.player.vy = 0;

      // Ghost trail every frame
      const px = state.player.x + state.player.w / 2;
      const py = state.player.y + state.player.h / 2;
      for (let k = 0; k < 3; k++) {
        state.particles.push({
          x: px + (Math.random() - .5) * 15, y: py + (Math.random() - .5) * 20,
          vx: -Math.cos(v.angle) * 2, vy: 0,
          life: 25, ml: 25, color: k === 0 ? s.core : s.c2,
          size: 4 + Math.random() * 4, grav: 0, type: 'smoke'
        });
      }
      state.dynamicLights.push({ x: px, y: py, r: 60, color: s.color, int: 1.5, life: 2, ml: 2 });

      // Damage enemies along the dash path
      if (v.age % 2 === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - px, e.y + e.h / 2 - py) < 40) {
            hurtEntity(e, s.phaseDmg, px, py);
            e.vx += Math.cos(v.angle) * 4;
            e.vy -= 3;
          }
        }
      }

      if (v.age > 8) { v.state = 2; v.age = 0; }
    } else if (v.state === 2) {
      // Landing burst
      if (v.age === 1) {
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        SoundFX.playSweep(1200, 400, 'sine', 0.4, 0.2);
        explode(px, py, 50, 6, s.dmg, s.color, s.c2);
        spawnP(px, py, s.core, 20, 'burst');
        state.shockwaves.push({ x: px, y: py, r: 0, maxR: 60, life: 10, maxLife: 10, color: s.core });
        state.dynamicLights.push({ x: px, y: py, r: 100, color: s.core, int: 2.5, life: 8, ml: 8 });
        state.shake(8);
        state.player.inv = false;
      }
      if (v.age > 15) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── PARADOX MINE — invisible proximity trigger ───
  'paradox-mine'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Cloaking — mine becomes barely visible
      if (v.age % 20 === 0) {
        state.dynamicLights.push({
          x: v.cx, y: v.cy, r: 15, color: s.color, int: 0.3, life: 3, ml: 3
        });
      }
      // Check proximity to enemies
      for (const e of state.entities) {
        if (!e.active) continue;
        if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.mineR) {
          v.state = 1; v.age = 0; v.triggered = e;
          break;
        }
      }
      if (v.age > s.mineDur) {
        // Mine expired — fizzle out
        spawnP(v.cx, v.cy, s.c2, 5, 'sparkle');
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    } else if (v.state === 1) {
      // Triggered — time freeze bubble expanding
      if (v.age === 1) {
        SoundFX.playSweep(1000, 300, 'sine', 0.7, 0.4);
        SoundFX.playNoise(0.4, 0.3, 400, 'bandpass');
        spawnP(v.cx, v.cy, s.core, 25, 'burst');
        spawnP(v.cx, v.cy, s.c2, 15, 'sparkle');
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.mineR, life: 15, maxLife: 15, color: s.core });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.mineR * 1.5, color: s.core, int: 3, life: 12, ml: 12 });
        state.shake(10);
        // Freeze all enemies in range
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.mineR) {
            state.frozenEntities.set(e, (state.frozenEntities.get(e) || 0) + s.mineFreeze);
            hurtEntity(e, 15, v.cx, v.cy);
          }
        }
      }
      // Frost bubble visual lingers
      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        state.particles.push({
          x: v.cx + Math.cos(a) * s.mineR * 0.8, y: v.cy + Math.sin(a) * s.mineR * 0.8,
          vx: -Math.cos(a) * 0.5, vy: -Math.sin(a) * 0.5,
          life: 20, ml: 20, color: s.core, size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
        });
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.mineR, color: s.core, int: 1, life: 2, ml: 2 });
      if (v.age > 30) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── HASTE ZONE — speed boost field ───
  'haste-zone'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Zone forming
      if (v.age === 1) {
        SoundFX.playSweep(400, 900, 'sine', 0.4, 0.3);
        spawnP(v.cx, v.cy, s.core, 20, 'burst');
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.hasteR, life: 15, maxLife: 15, color: s.core });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.hasteR * 1.2, color: s.core, int: 2, life: 8, ml: 8 });
      }
      if (v.age > 10) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      // Active zone — boost player + accelerate projectiles + slow enemies
      const px = state.player.x + state.player.w / 2;
      const py = state.player.y + state.player.h / 2;

      // ── Player speed boost ──
      if (Math.hypot(px - v.cx, py - v.cy) < s.hasteR) {
        // Strong speed multiplier
        state.player.vx *= s.hasteMult;
        // Jump boost
        if (state.player.vy < -1) state.player.vy *= 1.1;
        if (v.age % 3 === 0) {
          spawnP(px, py, s.core, 1, 'sparkle');
          // Speed lines behind player
          const pa = Math.atan2(state.player.vy, state.player.vx) + Math.PI;
          state.particles.push({
            x: px + Math.cos(pa) * 8, y: py + Math.sin(pa) * 8,
            vx: Math.cos(pa) * 3, vy: Math.sin(pa) * 3,
            life: 8, ml: 8, color: s.core, size: 2, grav: 0, type: 'trail'
          });
        }
      }

      // ── Accelerate friendly projectiles passing through ──
      for (const proj of state.projectiles) {
        if (Math.hypot(proj.x - v.cx, proj.y - v.cy) < s.hasteR) {
          if (!proj._hasted) {
            // First time entering zone — boost speed by 60%
            proj.vx *= 1.6;
            proj.vy *= 1.6;
            proj._hasted = true;
            // Acceleration flash
            spawnP(proj.x, proj.y, s.core, 3, 'sparkle');
            state.dynamicLights.push({ x: proj.x, y: proj.y, r: 20, color: s.core, int: 1, life: 3, ml: 3 });
          }
        } else {
          // Reset flag when projectile leaves zone (can be boosted again if re-enters)
          proj._hasted = false;
        }
      }

      // ── Slow enemies inside ──
      if (v.age % 6 === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.hasteR) {
            e.vx *= 0.6; e.vy *= 0.6;
            spawnP(e.x + e.w / 2, e.y + e.h / 2, '#aaaaff', 1, 'sparkle');
          }
        }
      }

      // ── Visual: pulsing ring particles ──
      if (v.age % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        state.particles.push({
          x: v.cx + Math.cos(a) * s.hasteR, y: v.cy + Math.sin(a) * s.hasteR * 0.5,
          vx: -Math.cos(a) * 1.5, vy: -0.5,
          life: 18, ml: 18, color: Math.random() > .5 ? s.color : s.core,
          size: 2 + Math.random() * 2, grav: -0.01, type: 'sparkle'
        });
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.hasteR, color: s.color, int: 0.7 + Math.sin(v.age * 0.1) * 0.3, life: 2, ml: 2 });
      if (v.age > s.hasteDur) {
        spawnP(v.cx, v.cy, s.c2, 10, 'sparkle');
        SoundFX.playSweep(900, 400, 'sine', 0.2, 0.2);
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── ENTROPY CASCADE — chain reaction jumping between enemies ───
  'entropy-cascade'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Current target decaying
      if (v.age === 1) {
        SoundFX.playSweep(300, 100, 'sawtooth', 0.3, 0.3);
        spawnP(v.cx, v.cy, s.color, 12, 'void');
        spawnP(v.cx, v.cy, s.core, 8, 'sparkle');
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 60, color: s.color, int: 2, life: 8, ml: 8 });
        state.shake(3);
        // Damage at current position
        for (const e of state.entities) {
          if (!e.active) continue;
          if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < 30) {
            hurtEntity(e, s.cascadeDmg, v.cx, v.cy);
          }
        }
      }
      // Crumbling particles
      if (v.age % 2 === 0) {
        state.particles.push({
          x: v.cx + (Math.random() - .5) * 20, y: v.cy + (Math.random() - .5) * 20,
          vx: (Math.random() - .5) * 3, vy: Math.random() * 2,
          life: 20, ml: 20, color: Math.random() > .5 ? s.color : '#886644',
          size: 2 + Math.random() * 3, grav: 0.1, type: 'dust'
        });
      }
      if (v.age > 15) {
        // Try to jump to nearest un-hit enemy
        if (v.jumps > 0) {
          let closest = null, closestDist = s.cascadeR;
          for (const e of state.entities) {
            if (!e.active || v.hitList.includes(e)) continue;
            const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
            if (d < closestDist) { closestDist = d; closest = e; }
          }
          if (closest) {
            // Draw chain lightning between points
            const ex = closest.x + closest.w / 2;
            const ey = closest.y + closest.h / 2;
            // Chain particle trail
            const dx = ex - v.cx, dy = ey - v.cy;
            const dist = Math.hypot(dx, dy);
            for (let k = 0; k < 8; k++) {
              const t = k / 8;
              state.particles.push({
                x: v.cx + dx * t + (Math.random() - .5) * 10,
                y: v.cy + dy * t + (Math.random() - .5) * 10,
                vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2,
                life: 12, ml: 12, color: s.core,
                size: 2 + Math.random(), grav: 0, type: 'trail'
              });
            }
            v.hitList.push(closest);
            v.cx = ex; v.cy = ey;
            v.jumps--;
            v.age = 0; // restart state 0 at new location
            return;
          }
        }
        // No more jumps or targets — end
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── TEMPORAL RIFT — portal pair that teleports projectiles ───
  'temporal-rift'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Portals forming
      if (v.age === 1) {
        SoundFX.playSweep(200, 600, 'sine', 0.5, 0.4);
        SoundFX.playSweep(600, 200, 'sine', 0.3, 0.3);
        spawnP(v.p1x, v.p1y, s.color, 15, 'void');
        spawnP(v.p2x, v.p2y, s.c2, 15, 'void');
        state.shockwaves.push({ x: v.p1x, y: v.p1y, r: 0, maxR: s.riftR, life: 12, maxLife: 12, color: s.color });
        state.shockwaves.push({ x: v.p2x, y: v.p2y, r: 0, maxR: s.riftR, life: 12, maxLife: 12, color: s.c2 });
        state.dynamicLights.push({ x: v.p1x, y: v.p1y, r: 80, color: s.color, int: 2, life: 8, ml: 8 });
        state.dynamicLights.push({ x: v.p2x, y: v.p2y, r: 80, color: s.c2, int: 2, life: 8, ml: 8 });
      }
      if (v.age > 15) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      // Active — teleport projectiles between portals
      for (const p of state.projectiles) {
        if (p._rifted === v) continue; // already teleported by this rift
        // Check portal 1
        if (Math.hypot(p.x - v.p1x, p.y - v.p1y) < s.riftR * 0.6) {
          const angle = Math.atan2(v.p2y - v.p1y, v.p2x - v.p1x);
          p.x = v.p2x + Math.cos(angle) * s.riftR * 0.7;
          p.y = v.p2y + Math.sin(angle) * s.riftR * 0.7;
          p._rifted = v;
          SoundFX.playTone(700, 'sine', 0.15, 0.08);
          spawnP(v.p2x, v.p2y, s.core, 5, 'sparkle');
        }
        // Check portal 2
        else if (Math.hypot(p.x - v.p2x, p.y - v.p2y) < s.riftR * 0.6) {
          const angle = Math.atan2(v.p1y - v.p2y, v.p1x - v.p2x);
          p.x = v.p1x + Math.cos(angle) * s.riftR * 0.7;
          p.y = v.p1y + Math.sin(angle) * s.riftR * 0.7;
          p._rifted = v;
          SoundFX.playTone(500, 'sine', 0.15, 0.08);
          spawnP(v.p1x, v.p1y, s.core, 5, 'sparkle');
        }
      }
      // Swirling portal particles
      if (v.age % 3 === 0) {
        for (const [px, py, col] of [[v.p1x, v.p1y, s.color], [v.p2x, v.p2y, s.c2]]) {
          const a = v.age * 0.15 + Math.random() * Math.PI * 2;
          const r = s.riftR * 0.5 + Math.random() * s.riftR * 0.3;
          state.particles.push({
            x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * 0.5,
            vx: -Math.cos(a) * 2, vy: -Math.sin(a) * 1,
            life: 15, ml: 15, color: col, size: 2 + Math.random() * 2, grav: 0, type: 'void'
          });
        }
      }
      state.dynamicLights.push({ x: v.p1x, y: v.p1y, r: s.riftR, color: s.color, int: 0.8 + Math.sin(v.age * 0.1) * 0.3, life: 2, ml: 2 });
      state.dynamicLights.push({ x: v.p2x, y: v.p2y, r: s.riftR, color: s.c2, int: 0.8 + Math.cos(v.age * 0.1) * 0.3, life: 2, ml: 2 });

      if (v.age > s.riftDur) {
        SoundFX.playSweep(600, 100, 'sine', 0.3, 0.3);
        spawnP(v.p1x, v.p1y, s.color, 10, 'void');
        spawnP(v.p2x, v.p2y, s.c2, 10, 'void');
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── DÉJÀ VU — damage recording and replay ───
  'deja-vu'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Recording phase — track damage on target
      const t = v.target;
      if (!t || !t.active) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
        return;
      }
      const tx = t.x + t.w / 2, ty = t.y + t.h / 2;

      // Track damage by hooking into damage numbers
      if (v.age === 1) v._lastHp = t.hp;
      if (t.hp < v._lastHp) {
        v.storedDmg += (v._lastHp - t.hp);
        v._lastHp = t.hp;
      }

      // Floating clock indicator above target
      if (v.age % 8 === 0) {
        const a = v.age * 0.15;
        state.particles.push({
          x: tx + Math.cos(a) * 15, y: ty - 20 + Math.sin(a) * 5,
          vx: 0, vy: -0.5, life: 12, ml: 12, color: s.core,
          size: 2, grav: 0, type: 'sparkle'
        });
      }
      state.dynamicLights.push({ x: tx, y: ty, r: 30, color: s.color, int: 0.4 + Math.sin(v.age * 0.15) * 0.2, life: 2, ml: 2 });

      if (v.age > s.dejaDur) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      // Replay — deal all stored damage at once
      const t = v.target;
      if (v.age === 1 && t && t.active) {
        const tx = t.x + t.w / 2, ty = t.y + t.h / 2;
        const totalDmg = Math.floor(v.storedDmg * 1.5); // 150% damage replay!
        if (totalDmg > 0) {
          SoundFX.playSweep(400, 1200, 'sine', 0.8, 0.3);
          SoundFX.playNoise(0.6, 0.4, 300, 'lowpass');
          hurtEntity(t, totalDmg, tx, ty);
          t.vy -= 8 / (t.mass || 1);
          spawnP(tx, ty, s.core, 30, 'burst');
          spawnP(tx, ty, '#ffffff', 15, 'explode');
          state.shockwaves.push({ x: tx, y: ty, r: 0, maxR: s.dejaR, life: 15, maxLife: 15, color: s.core });
          state.dynamicLights.push({ x: tx, y: ty, r: 120, color: s.core, int: 3, life: 10, ml: 10 });
          state.shake(12);
          // Damage number with special color
          state.damageNumbers.push({ x: tx, y: ty - 25, val: totalDmg, life: 90, vy: -3, color: s.core, sc: 2.5 });
          // Rewind spiral particles
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2;
            state.particles.push({
              x: tx + Math.cos(a) * 30, y: ty + Math.sin(a) * 30,
              vx: -Math.cos(a) * 4, vy: -Math.sin(a) * 4,
              life: 25, ml: 25, color: k % 2 ? s.core : s.c2,
              size: 3 + Math.random() * 2, grav: 0, type: 'trail'
            });
          }
        }
      }
      if (v.age > 20) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── CHRONO BREAK (ULTIMATE) — time stop + bombardment + resume ───
  'chrono-break'(v) {
    const s = v.spell;

    if (v.state === 0) {
      // ── Phase 1: Time Gathering — player rises, clock appears ──
      if (v.age === 1) {
        SoundFX.playSweep(100, 800, 'sine', 2.0, 1.0);
        state.player.castAnim = 500; state.player.castType = 'up';
        state.player.vx = 0; state.player.vy = 0;
        v.savedEntities = [];
      }
      // Player floats up
      state.player.vy = -1.5;
      state.player.vx = 0;
      // Gathering chrono particles
      if (v.age % 2 === 0) {
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 80;
          state.particles.push({
            x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
            vx: -Math.cos(a) * 4, vy: -Math.sin(a) * 4,
            life: 20, ml: 20, color: k % 2 ? s.core : s.c2,
            size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
          });
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: v.age * 5, color: s.core, int: 1 + v.age / 40, life: 2, ml: 2 });
      state.shake(Math.min(v.age / 10, 6));

      if (v.age > 50) { v.state = 1; v.age = 0; }

    } else if (v.state === 1) {
      // ── Phase 2: TIME STOP — freeze everything, screen tint ──
      if (v.age === 1) {
        SoundFX.playNoise(2.0, 0.3, 100, 'lowpass');
        SoundFX.playTone(220, 'square', 0.8, 0.5);
        state.shake(30);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 400, life: 20, maxLife: 20, color: '#ffffff' });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 500, color: '#ffffff', int: 4, life: 5, ml: 5 });
        // Freeze all entities
        for (const e of state.entities) {
          if (!e.active) continue;
          v.savedEntities.push({ e, vx: e.vx, vy: e.vy });
          e.vx = 0; e.vy = 0;
          state.frozenEntities.set(e, 200);
          spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 5, 'sparkle');
        }
        v.strikes = [];
      }
      // Place damage markers — floating sword/clock strikes around frozen enemies
      if (!v.strikes) v.strikes = [];
      if (v.age % 6 === 0 && v.strikes.length < s.breakStrikes) {
        // Pick random position near an enemy
        const targets = state.entities.filter(e => e.active);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          const sx = t.x + t.w / 2 + (Math.random() - .5) * 40;
          const sy = t.y + t.h / 2 + (Math.random() - .5) * 40;
          v.strikes.push({ x: sx, y: sy });
          SoundFX.playTone(600 + v.strikes.length * 50, 'sine', 0.2, 0.08);
          spawnP(sx, sy, s.core, 6, 'sparkle');
          state.dynamicLights.push({ x: sx, y: sy, r: 30, color: s.core, int: 1.5, life: 5, ml: 5 });
        }
      }
      // Frozen tint effect
      state.dynamicLights.push({ x: state.W / 2, y: state.H / 2, r: 600, color: '#4466ff', int: 0.2, life: 2, ml: 2 });

      if (v.age > 80) { v.state = 2; v.age = 0; }

    } else if (v.state === 2) {
      // ── Phase 3: TIME RESUME — all strikes detonate simultaneously ──
      if (v.age === 1) {
        SoundFX.playSweep(200, 1500, 'sawtooth', 2.0, 0.6);
        SoundFX.playNoise(3.0, 0.8, 80, 'lowpass');
        state.shake(50);

        // Detonate all strikes at once
        for (const st of (v.strikes || [])) {
          explode(st.x, st.y, 60, 8, Math.floor(s.dmg / 3), s.color, s.c2);
          spawnP(st.x, st.y, s.core, 15, 'burst');
          spawnP(st.x, st.y, '#ffffff', 8, 'explode');
          state.shockwaves.push({
            x: st.x, y: st.y, r: 0, maxR: 80,
            life: 12, maxLife: 12, color: s.core
          });
          state.dynamicLights.push({ x: st.x, y: st.y, r: 100, color: s.core, int: 3, life: 8, ml: 8 });
        }
        // Final mega shockwave
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.breakR, life: 25, maxLife: 25, color: '#ffffff' });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 500, color: '#ffffff', int: 5, life: 10, ml: 10 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 350, color: s.core, int: 4, life: 15, ml: 15 });

        // Unfreeze entities with massive knockback
        for (const saved of v.savedEntities) {
          if (saved.e.active) {
            const dx = saved.e.x + saved.e.w / 2 - v.cx;
            const dy = saved.e.y + saved.e.h / 2 - v.cy;
            const dist = Math.hypot(dx, dy) || 1;
            saved.e.vx = (dx / dist) * 15;
            saved.e.vy = (dy / dist) * 15 - 8;
          }
        }
        state.player.inv = false;
        state.player.castAnim = 0;
      }
      // Lingering particles and aftershock
      if (v.age % 3 === 0 && v.age < 30) {
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * Math.PI * 2;
          state.particles.push({
            x: v.cx + Math.cos(a) * Math.random() * 200,
            y: v.cy + Math.sin(a) * Math.random() * 200,
            vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 2,
            life: 30, ml: 30, color: k % 3 === 0 ? '#ffffff' : k % 3 === 1 ? s.core : s.c2,
            size: 3 + Math.random() * 3, grav: 0.05, type: 'debris',
            rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.5,
          });
        }
        state.shake(Math.max(0, 20 - v.age));
      }
      if (v.age > 60) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },
};

// ── VFX Draw Handlers ──────────────────────────────────────────────────────
export const VFX_DRAW = {
  ...MANIFEST_VFX_DRAW,

  // Echo ghost — translucent duplicate that pulses
  'echo-ghost'(v, X) {
    if (v.state !== 0) return;
    const s = v.spell;
    const pulse = 0.3 + Math.sin(v.age * 0.4) * 0.15;
    const r = 8 + Math.sin(v.age * 0.3) * 2;
    // Outer glow
    const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r * 2.5);
    g.addColorStop(0, s.core); g.addColorStop(0.5, s.color); g.addColorStop(1, 'transparent');
    X.fillStyle = g; X.globalAlpha = pulse * 0.4;
    X.beginPath(); X.arc(v.cx, v.cy, r * 2.5, 0, Math.PI * 2); X.fill();
    // Core
    X.fillStyle = s.core; X.globalAlpha = pulse;
    X.beginPath(); X.arc(v.cx, v.cy, r, 0, Math.PI * 2); X.fill();
    // Clock hands
    const ha = v.age * 0.2;
    X.strokeStyle = s.c2; X.lineWidth = 1.5; X.globalAlpha = pulse * 0.7;
    X.beginPath(); X.moveTo(v.cx, v.cy);
    X.lineTo(v.cx + Math.cos(ha) * r * 0.8, v.cy + Math.sin(ha) * r * 0.8); X.stroke();
    X.beginPath(); X.moveTo(v.cx, v.cy);
    X.lineTo(v.cx + Math.cos(ha * 3) * r * 0.5, v.cy + Math.sin(ha * 3) * r * 0.5); X.stroke();
    X.globalAlpha = 1;
  },

  // Paradox mine — barely visible cloaked circle
  'paradox-mine'(v, X) {
    if (v.state !== 0) return;
    const s = v.spell;
    const cloakAlpha = 0.05 + Math.sin(v.age * 0.05) * 0.03;
    // Subtle distortion ring
    X.strokeStyle = s.color; X.lineWidth = 1; X.globalAlpha = cloakAlpha;
    X.setLineDash([4, 8]);
    X.beginPath(); X.arc(v.cx, v.cy, s.mineR * 0.5, 0, Math.PI * 2); X.stroke();
    X.setLineDash([]);
    // Tiny core dot
    X.fillStyle = s.core; X.globalAlpha = cloakAlpha * 2;
    X.beginPath(); X.arc(v.cx, v.cy, 2, 0, Math.PI * 2); X.fill();
    X.globalAlpha = 1;
  },

  // Haste zone — golden speed ring with inner lines
  'haste-zone'(v, X) {
    if (v.state !== 1) return;
    const s = v.spell;
    const T = performance.now() * 0.001;
    const pulse = 0.92 + Math.sin(T * 2) * 0.08;
    const r = s.hasteR * pulse;

    // Outer ring glow
    const g = X.createRadialGradient(v.cx, v.cy, r * 0.7, v.cx, v.cy, r);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.8, s.color + '33'); g.addColorStop(1, s.color + '88');
    X.fillStyle = g; X.globalAlpha = 0.3;
    X.beginPath(); X.arc(v.cx, v.cy, r, 0, Math.PI * 2); X.fill();

    // Dashed ring
    X.strokeStyle = s.core; X.lineWidth = 2; X.globalAlpha = 0.5;
    X.setLineDash([6, 6]);
    X.beginPath(); X.arc(v.cx, v.cy, r, 0, Math.PI * 2); X.stroke();
    X.setLineDash([]);

    // Speed lines radiating inward
    X.strokeStyle = s.core; X.lineWidth = 1; X.globalAlpha = 0.2;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + T * 1.5;
      X.beginPath();
      X.moveTo(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r);
      X.lineTo(v.cx + Math.cos(a) * r * 0.6, v.cy + Math.sin(a) * r * 0.6);
      X.stroke();
    }

    // Center icon — rotating arrows
    X.strokeStyle = s.core; X.lineWidth = 2; X.globalAlpha = 0.4;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + T * 3;
      const ir = 12;
      X.beginPath();
      X.moveTo(v.cx + Math.cos(a) * ir, v.cy + Math.sin(a) * ir);
      X.lineTo(v.cx + Math.cos(a + 0.3) * ir * 0.6, v.cy + Math.sin(a + 0.3) * ir * 0.6);
      X.stroke();
    }
    X.globalAlpha = 1;
  },

  // Temporal rift — swirling portal pair
  'temporal-rift'(v, X) {
    if (v.state !== 1) return;
    const s = v.spell;
    const T = performance.now() * 0.001;

    for (const [px, py, col, col2] of [[v.p1x, v.p1y, s.color, s.c2], [v.p2x, v.p2y, s.c2, s.color]]) {
      // Outer glow
      const g = X.createRadialGradient(px, py, 0, px, py, s.riftR);
      g.addColorStop(0, col + 'aa'); g.addColorStop(0.4, col + '44'); g.addColorStop(1, 'transparent');
      X.fillStyle = g; X.globalAlpha = 0.4;
      X.beginPath(); X.arc(px, py, s.riftR, 0, Math.PI * 2); X.fill();

      // Spinning spiral arms
      X.strokeStyle = col2; X.lineWidth = 2; X.globalAlpha = 0.5;
      for (let arm = 0; arm < 3; arm++) {
        X.beginPath();
        for (let t = 0; t < 30; t++) {
          const a = (arm / 3) * Math.PI * 2 + T * 2 + t * 0.15;
          const r = (t / 30) * s.riftR * 0.8;
          const x = px + Math.cos(a) * r;
          const y = py + Math.sin(a) * r * 0.5; // elliptical
          if (t === 0) X.moveTo(x, y); else X.lineTo(x, y);
        }
        X.stroke();
      }

      // Dark core
      X.fillStyle = '#000011'; X.globalAlpha = 0.6;
      X.beginPath(); X.arc(px, py, s.riftR * 0.2, 0, Math.PI * 2); X.fill();
    }

    // Connection line between portals (subtle)
    X.strokeStyle = s.core; X.lineWidth = 1; X.globalAlpha = 0.15;
    X.setLineDash([4, 8]);
    X.beginPath(); X.moveTo(v.p1x, v.p1y); X.lineTo(v.p2x, v.p2y); X.stroke();
    X.setLineDash([]);
    X.globalAlpha = 1;
  },

  // Déjà Vu — clock/timer above target
  'deja-vu'(v, X) {
    if (v.state !== 0 || !v.target || !v.target.active) return;
    const s = v.spell;
    const T = performance.now() * 0.001;
    const t = v.target;
    const tx = t.x + t.w / 2, ty = t.y - 15;
    const progress = v.age / s.dejaDur;

    // Clock circle above target
    X.strokeStyle = s.core; X.lineWidth = 1.5; X.globalAlpha = 0.6;
    X.beginPath(); X.arc(tx, ty, 10, 0, Math.PI * 2); X.stroke();
    // Progress arc
    X.strokeStyle = s.color; X.lineWidth = 2; X.globalAlpha = 0.8;
    X.beginPath(); X.arc(tx, ty, 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); X.stroke();
    // Clock hand
    const ha = -Math.PI / 2 + progress * Math.PI * 2;
    X.strokeStyle = s.core; X.lineWidth = 1; X.globalAlpha = 0.7;
    X.beginPath(); X.moveTo(tx, ty); X.lineTo(tx + Math.cos(ha) * 7, ty + Math.sin(ha) * 7); X.stroke();
    // Stored damage counter
    if (v.storedDmg > 0) {
      X.font = '8px monospace'; X.textAlign = 'center'; X.fillStyle = s.core; X.globalAlpha = 0.7;
      X.fillText(Math.floor(v.storedDmg), tx, ty + 24);
    }
    X.globalAlpha = 1;
  },

  // Chrono Break ultimate — screen tint during time stop
  'chrono-break'(v, X) {
    const s = v.spell;
    if (v.state === 0) {
      // Giant clock forming at player position
      const T = performance.now() * 0.001;
      const pr = Math.min(1, v.age / 40);
      const cx = state.player.x + state.player.w / 2;
      const cy = state.player.y + state.player.h / 2;
      const r = 60 * pr;

      // Outer clock ring
      X.strokeStyle = s.core; X.lineWidth = 2; X.globalAlpha = 0.5 * pr;
      X.beginPath(); X.arc(cx, cy, r, 0, Math.PI * 2); X.stroke();

      // Clock ticks
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        X.strokeStyle = s.c2; X.lineWidth = 1.5; X.globalAlpha = 0.4 * pr;
        X.beginPath();
        X.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
        X.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        X.stroke();
      }

      // Spinning hands (accelerating)
      const speed = v.age * 0.08;
      X.strokeStyle = s.core; X.lineWidth = 2; X.globalAlpha = 0.6 * pr;
      X.beginPath(); X.moveTo(cx, cy);
      X.lineTo(cx + Math.cos(speed) * r * 0.7, cy + Math.sin(speed) * r * 0.7); X.stroke();
      X.beginPath(); X.moveTo(cx, cy);
      X.lineTo(cx + Math.cos(speed * 4) * r * 0.4, cy + Math.sin(speed * 4) * r * 0.4); X.stroke();

      X.globalAlpha = 1;

    } else if (v.state === 1) {
      // Time stop — blue screen tint
      X.fillStyle = '#112244'; X.globalAlpha = 0.15 + Math.sin(v.age * 0.05) * 0.05;
      X.fillRect(0, 0, state.W, state.H);

      // Strike markers — glowing X marks
      if (!v.strikes) return;
      for (let i = 0; i < v.strikes.length; i++) {
        const st = v.strikes[i];
        const pulse = 0.6 + Math.sin(v.age * 0.2 + i * 1.5) * 0.3;
        // Glow
        const g = X.createRadialGradient(st.x, st.y, 0, st.x, st.y, 20);
        g.addColorStop(0, s.core); g.addColorStop(1, 'transparent');
        X.fillStyle = g; X.globalAlpha = pulse * 0.4;
        X.beginPath(); X.arc(st.x, st.y, 20, 0, Math.PI * 2); X.fill();
        // X mark
        X.strokeStyle = '#ffffff'; X.lineWidth = 2; X.globalAlpha = pulse * 0.8;
        X.beginPath(); X.moveTo(st.x - 6, st.y - 6); X.lineTo(st.x + 6, st.y + 6); X.stroke();
        X.beginPath(); X.moveTo(st.x + 6, st.y - 6); X.lineTo(st.x - 6, st.y + 6); X.stroke();
      }
      X.globalAlpha = 1;

    } else if (v.state === 2) {
      // Flash on detonation
      if (v.age < 8) {
        X.fillStyle = '#ffffff'; X.globalAlpha = Math.max(0, 0.6 - v.age / 12);
        X.fillRect(0, 0, state.W, state.H);
      }
      X.globalAlpha = 1;
    }
  },
};
