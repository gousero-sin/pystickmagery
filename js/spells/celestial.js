// ═══════════════════════════════════════════════════════════════════════════
// celestial.js — Cosmic & Stellar Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
  // 1. Comet — accelerating projectile with massive fiery tail + crater on impact
  {
    name: 'Comet', icon: '☄️', key: 'N', color: '#ff8833', c2: '#ffcc66',
    core: '#ffffcc', speed: 5, dmg: 35, mana: 18, cd: 500, r: 6, grav: 0,
    drag: 1, bounce: 0, exR: 70, exF: 12, trail: 'comet',
    isComet: true, cometAccel: 0.4, cometMaxSpd: 28,
    desc: 'Accelerating comet — devastating impact'
  },

  // 2. Star Collapse — star forms at cursor, pulls enemies in, then collapses + explodes
  {
    name: 'Star Collapse', icon: '💫', key: 'X', color: '#ffdd44', c2: '#ffee88',
    core: '#ffffee', speed: 0, dmg: 50, mana: 30, cd: 900, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'star',
    isStarCollapse: true, starR: 120, starPull: 0.8, starChargeT: 80, starCollapseT: 20,
    desc: 'Forms a star that implodes violently'
  },

  // 3. Aurora Veil — shimmering aurora shield that blocks and damages
  {
    name: 'Aurora Veil', icon: '🌌', key: 'C', color: '#44ffaa', c2: '#ff66dd',
    core: '#aaddff', speed: 0, dmg: 8, mana: 25, cd: 700, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'aurora',
    isAuroraVeil: true, auroraW: 160, auroraH: 120, auroraDur: 360, auroraDmg: 6,
    desc: 'Shimmering cosmic shield — blocks and burns'
  },

  // 4. Meteor Shower — rains 8 meteors from the sky with warning circles
  {
    name: 'Meteor Shower', icon: '🌠', key: 'F', color: '#ff5533', c2: '#ff9944',
    core: '#ffdd88', speed: 0, dmg: 28, mana: 35, cd: 1200, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'meteor',
    isMeteorShower: true, meteorCount: 8, meteorR: 45, meteorSpread: 250,
    desc: 'Rains meteors from the heavens'
  },

  createManifestSpell({
    name: 'Starway', icon: '🌠',
    color: '#7aa4ff', c2: '#ffd680', core: '#ffffff',
    manifestStyle: 'celestial', manifestEffect: 'celestial_drift', manifestProfile: 'stars', manifestGlyph: '*',
    manifestDuration: 780,
    mana: 24, cd: 900, manifestArc: 20, manifestThickness: 9, manifestSegmentHp: 24,
    desc: 'Manifest a fading starway that lightens every step'
  }),

  // 5. Big Bang (ULTIMATE) — cosmic creation: compress → singularity → expansion → nebula
  {
    name: 'Big Bang', icon: '✨', key: 'T', color: '#cc44ff', c2: '#ff66aa',
    core: '#ffffff', speed: 0, dmg: 90, mana: 90, cd: 9000, r: 0, grav: 0,
    drag: 1, bounce: 0, trail: 'cosmic',
    isBigBang: true, bangR: 350, bangDur: 600,
    desc: 'The birth of a universe (Ultimate)'
  },
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  ...MANIFEST_FIRE_HANDLERS,
  isStarCollapse(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'star-collapse', state: 0, age: 0,
      cx: tx, cy: ty, spell: s, pulledEntities: []
    });
    return true;
  },

  isAuroraVeil(s, ox, oy, tx, ty) {
    const angle = Math.atan2(ty - oy, tx - ox);
    state.vfxSequences.push({
      type: 'aurora-veil', state: 0, age: 0,
      cx: ox + Math.cos(angle) * 60, cy: oy + Math.sin(angle) * 30,
      angle, spell: s
    });
    return true;
  },

  isMeteorShower(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'meteor-shower', state: 0, age: 0,
      cx: tx, cy: ty, spell: s,
      meteors: [], impacted: 0
    });
    return true;
  },

  isBigBang(s, ox, oy, tx, ty) {
    state.vfxSequences.push({
      type: 'big-bang', state: 0, age: 0,
      cx: state.player.x + state.player.w / 2,
      cy: state.player.y + state.player.h / 2,
      spell: s, stars: [], nebulaParticles: []
    });
    state.player.inv = true;
    return true;
  },
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
export const PROJ_HOOKS = {
  isComet: {
    onUpdate(p, s) {
      // Accelerate over time
      const angle = Math.atan2(p.vy, p.vx);
      const spd = Math.hypot(p.vx, p.vy);
      if (spd < s.cometMaxSpd) {
        p.vx += Math.cos(angle) * s.cometAccel;
        p.vy += Math.sin(angle) * s.cometAccel;
      }
      // Grow radius as it speeds up
      p.growR = s.r + (spd / s.cometMaxSpd) * 4;
      // Screen shake builds as it moves
      if (p.age > 10 && p.age % 8 === 0) state.shake(1);
      // Dynamic light grows
      state.dynamicLights.push({
        x: p.x, y: p.y, r: 40 + spd * 2,
        color: s.core, int: 1 + spd / s.cometMaxSpd, life: 2, ml: 2
      });
      // Cinematic sound buildup
      if (p.age === 5) SoundFX.playSweep(100, 600, 'sine', 0.3, 1.5);
    },
    onLand(p, s, hitPlat, hitEntity) {
      const spd = Math.hypot(p.vx, p.vy);
      const power = Math.min(1, spd / s.cometMaxSpd);

      // ── CRATER IMPACT ──
      SoundFX.playNoise(1.5 + power, 0.8, 60, 'lowpass');
      SoundFX.playSweep(300, 80, 'sawtooth', 0.8, 0.5);
      state.shake(20 + power * 30);

      // Massive explosion scaled by speed
      const exR = s.exR + power * 40;
      explode(p.x, p.y, exR, s.exF + power * 8, s.dmg, s.color, s.c2);

      // Fiery debris shower
      for (let k = 0; k < 30 + power * 20; k++) {
        const a = Math.random() * Math.PI * 2;
        const spd2 = 3 + Math.random() * 8 * power;
        state.particles.push({
          x: p.x, y: p.y, vx: Math.cos(a) * spd2, vy: Math.sin(a) * spd2 - 4,
          life: 60 + Math.random() * 40, ml: 100,
          color: k % 3 === 0 ? '#ff4411' : k % 3 === 1 ? s.color : s.c2,
          size: 3 + Math.random() * 5, grav: 0.15,
          rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.8, type: 'debris'
        });
      }
      // Smoke column
      for (let k = 0; k < 15; k++) {
        state.particles.push({
          x: p.x + (Math.random() - .5) * 30, y: p.y + (Math.random() - .5) * 10,
          vx: (Math.random() - .5) * 2, vy: -2 - Math.random() * 3,
          life: 80 + Math.random() * 40, ml: 120,
          color: k % 2 ? '#443322' : '#665544', size: 8 + Math.random() * 6,
          grav: -0.03, type: 'smoke'
        });
      }
      // Multiple shockwaves
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: exR * 1.5, life: 18, maxLife: 18, color: s.core });
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: exR, life: 12, maxLife: 12, color: s.color });
      // Intense light flash
      state.dynamicLights.push({ x: p.x, y: p.y, r: 300, color: '#ffffff', int: 5, life: 4, ml: 4 });
      state.dynamicLights.push({ x: p.x, y: p.y, r: 200, color: s.core, int: 3, life: 12, ml: 12 });

      // Ground scorch mark — persistent spikes as crater edges
      if (hitPlat) {
        for (let k = 0; k < 3; k++) {
          const sx = p.x + (Math.random() - .5) * exR * 0.8;
          state.spikes.push({
            x: sx - 8, y: p.y, w: 16, h: 0, maxH: 20 + Math.random() * 15,
            life: 200, maxLife: 200, dmg: 0,
            color: '#332211', c2: '#554433', phase: 'rise'
          });
        }
      }
    },
  },
};

// ── Trail Particle Emitters ────────────────────────────────────────────────
export const TRAIL_EMITTERS = {
  comet(p, s) {
    const spd = Math.hypot(p.vx, p.vy);
    const intensity = Math.min(1, spd / (s.cometMaxSpd || 20));
    const angle = Math.atan2(p.vy, p.vx) + Math.PI;
    // Main fiery tail — dense stream behind
    for (let k = 0; k < 2 + Math.floor(intensity * 4); k++) {
      const spread = (Math.random() - .5) * (0.4 + intensity * 0.3);
      const tailSpd = 1 + Math.random() * 3;
      state.particles.push({
        x: p.x + Math.cos(angle + spread) * 4,
        y: p.y + Math.sin(angle + spread) * 4,
        vx: Math.cos(angle + spread) * tailSpd,
        vy: Math.sin(angle + spread) * tailSpd,
        life: 15 + Math.floor(intensity * 20), ml: 35,
        color: k === 0 ? s.core : k < 3 ? s.c2 : s.color,
        size: 2 + Math.random() * 3 + intensity * 2,
        grav: 0.02, type: k < 2 ? 'ember' : 'trail'
      });
    }
    // Sparks flying off
    if (p.age % 3 === 0) {
      const sa = angle + (Math.random() - .5) * 1.5;
      state.particles.push({
        x: p.x, y: p.y, vx: Math.cos(sa) * (2 + Math.random() * 3),
        vy: Math.sin(sa) * (2 + Math.random() * 3),
        life: 10, ml: 10, color: s.core, size: 1 + Math.random(), grav: 0.05, type: 'sparkle'
      });
    }
  },

  star(p, s) {
    const a = Math.random() * Math.PI * 2;
    state.particles.push({
      x: p.x + Math.cos(a) * 5, y: p.y + Math.sin(a) * 5,
      vx: Math.cos(a) * 1, vy: Math.sin(a) * 1,
      life: 12, ml: 12, color: Math.random() > .5 ? s.core : s.c2,
      size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
    });
  },

  aurora(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - .5) * 20, y: p.y + (Math.random() - .5) * 20,
      vx: 0, vy: -0.5 - Math.random(), life: 20, ml: 20,
      color: Math.random() > .5 ? s.color : s.c2,
      size: 3 + Math.random() * 3, grav: -0.02, type: 'sparkle'
    });
  },

  meteor(p, s) {
    const a = Math.atan2(p.vy, p.vx) + Math.PI;
    for (let k = 0; k < 3; k++) {
      state.particles.push({
        x: p.x + Math.cos(a) * 3, y: p.y + Math.sin(a) * 3,
        vx: Math.cos(a + (Math.random() - .5) * 0.5) * 2,
        vy: Math.sin(a + (Math.random() - .5) * 0.5) * 2,
        life: 12, ml: 12, color: k === 0 ? s.core : s.color,
        size: 2 + Math.random() * 2, grav: 0.02, type: 'ember'
      });
    }
  },

  cosmic(p, s) {
    for (let k = 0; k < 2; k++) {
      const a = Math.random() * Math.PI * 2;
      const colors = ['#cc44ff', '#ff66aa', '#4488ff', '#44ffcc', '#ffffff'];
      state.particles.push({
        x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 8,
        vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5,
        life: 15, ml: 15, color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
      });
    }
  },
};

// ── VFX Update Handlers ────────────────────────────────────────────────────
export const VFX_UPDATE = {
  ...MANIFEST_VFX_UPDATE,

  // ─── STAR COLLAPSE — gravitational star that implodes ───
  'star-collapse'(v) {
    const s = v.spell;

    if (v.state === 0) {
      // ── Phase 0: Star forming — gathering light ──
      if (v.age === 1) {
        SoundFX.playSweep(200, 800, 'sine', 0.6, 0.8);
        SoundFX.playTone(120, 'sine', 0.3, 1.2);
      }
      // Particles spiral inward toward center
      if (v.age % 2 === 0) {
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = s.starR + Math.random() * 40;
          state.particles.push({
            x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
            vx: -Math.cos(a) * 3 + Math.cos(a + 1.5) * 2,
            vy: -Math.sin(a) * 3 + Math.sin(a + 1.5) * 2,
            life: 20, ml: 20, color: k === 0 ? s.core : s.c2,
            size: 2 + Math.random() * 2, grav: 0, type: 'sparkle'
          });
        }
      }
      // Growing light
      const formProg = Math.min(1, v.age / 30);
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: 40 + formProg * 80,
        color: s.core, int: 0.5 + formProg * 2, life: 2, ml: 2
      });
      state.shake(formProg * 2);
      if (v.age > 30) { v.state = 1; v.age = 0; }

    } else if (v.state === 1) {
      // ── Phase 1: Active star — pulling enemies in, pulsing ──
      const prog = Math.min(1, v.age / s.starChargeT);
      const pullR = s.starR * (0.5 + prog * 0.5);
      // Pull enemies
      for (const e of state.entities) {
        if (!e.active) continue;
        const dx = v.cx - (e.x + e.w / 2);
        const dy = v.cy - (e.y + e.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < pullR && dist > 10) {
          const pull = s.starPull * prog * (1 - dist / pullR);
          e.vx += (dx / dist) * pull;
          e.vy += (dy / dist) * pull;
        }
      }
      // Star core pulsing — light and particles
      const pulse = Math.sin(v.age * 0.3) * 0.3 + 0.7;
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: 80 + prog * 60 + pulse * 20,
        color: s.core, int: 2 + prog * 2, life: 2, ml: 2
      });
      // Solar flare eruptions
      if (v.age % 12 === 0) {
        const fa = Math.random() * Math.PI * 2;
        for (let k = 0; k < 6; k++) {
          state.particles.push({
            x: v.cx + Math.cos(fa) * 15, y: v.cy + Math.sin(fa) * 15,
            vx: Math.cos(fa) * (4 + Math.random() * 3),
            vy: Math.sin(fa) * (4 + Math.random() * 3),
            life: 18, ml: 18, color: k < 2 ? s.core : s.color,
            size: 3 + Math.random() * 3, grav: 0, type: 'ember'
          });
        }
      }
      // Accretion ring particles
      if (v.age % 2 === 0) {
        const ra = v.age * 0.2 + Math.random() * 0.5;
        const rr = 25 + prog * 15;
        state.particles.push({
          x: v.cx + Math.cos(ra) * rr, y: v.cy + Math.sin(ra) * rr * 0.4,
          vx: -Math.sin(ra) * 3, vy: Math.cos(ra) * 1.2,
          life: 10, ml: 10, color: Math.random() > .3 ? s.c2 : s.color,
          size: 2 + Math.random() * 2, grav: 0, type: 'trail'
        });
      }
      state.shake(1 + prog * 3);
      // Sound escalation
      if (v.age === Math.floor(s.starChargeT * 0.5)) SoundFX.playSweep(300, 1000, 'sine', 0.8, 0.6);
      if (v.age > s.starChargeT) { v.state = 2; v.age = 0; }

    } else if (v.state === 2) {
      // ── Phase 2: Collapse — star shrinks rapidly ──
      if (v.age === 1) {
        SoundFX.playSweep(1200, 100, 'sawtooth', 1.0, 0.3);
        // Suck all nearby particles inward (visual only — rapid inward burst)
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = 40 + Math.random() * 60;
          state.particles.push({
            x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
            vx: -Math.cos(a) * 8, vy: -Math.sin(a) * 8,
            life: 8, ml: 8, color: s.core, size: 3, grav: 0, type: 'sparkle'
          });
        }
      }
      const cProg = Math.min(1, v.age / s.starCollapseT);
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: 140 * (1 - cProg * 0.9),
        color: s.core, int: 4 + cProg * 4, life: 2, ml: 2
      });
      state.shake(5 + cProg * 15);
      if (v.age > s.starCollapseT) { v.state = 3; v.age = 0; }

    } else if (v.state === 3) {
      // ── Phase 3: EXPLOSION — massive outward blast ──
      if (v.age === 1) {
        SoundFX.playNoise(3.0, 1.0, 60, 'lowpass');
        SoundFX.playSweep(80, 2000, 'sawtooth', 2.0, 0.5);
        state.shake(50);
        // White flash
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 500, color: '#ffffff', int: 6, life: 6, ml: 6 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 350, color: s.core, int: 4, life: 15, ml: 15 });
        // Triple shockwave
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.starR * 2, life: 25, maxLife: 25, color: '#ffffff' });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.starR * 1.5, life: 18, maxLife: 18, color: s.core });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.starR, life: 12, maxLife: 12, color: s.color });
        // Damage all in radius
        for (const e of state.entities) {
          if (!e.active) continue;
          const dx = e.x + e.w / 2 - v.cx, dy = e.y + e.h / 2 - v.cy;
          const dist = Math.hypot(dx, dy);
          if (dist < s.starR) {
            const pct = 1 - dist / s.starR;
            hurtEntity(e, Math.floor(s.dmg * (0.5 + pct * 0.5)), v.cx, v.cy);
            const nDist = dist || 1;
            e.vx += (dx / nDist) * 20 * pct;
            e.vy += (dy / nDist) * 20 * pct - 8;
            if (e.rotV !== undefined) e.rotV += (Math.random() - .5) * 3;
          }
        }
        // Massive particle explosion — multicolor stellar debris
        for (let k = 0; k < 60; k++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 4 + Math.random() * 10;
          const colors = [s.core, s.c2, s.color, '#ffffff', '#ff8844', '#ffdd66'];
          state.particles.push({
            x: v.cx, y: v.cy,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2,
            life: 40 + Math.random() * 30, ml: 70,
            color: colors[k % colors.length],
            size: 2 + Math.random() * 5, grav: 0.04,
            rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.5,
            type: k < 20 ? 'burst' : k < 40 ? 'explode' : 'ember'
          });
        }
        // Hot gas clouds
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          state.particles.push({
            x: v.cx + Math.cos(a) * 20, y: v.cy + Math.sin(a) * 20,
            vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1,
            life: 60, ml: 60, color: k % 2 ? '#ffaa44' : '#ff6622',
            size: 10 + Math.random() * 8, grav: -0.02, type: 'cloud'
          });
        }
      }
      if (v.age > 40) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── AURORA VEIL — shimmering cosmic shield ───
  'aurora-veil'(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Deploy animation
      if (v.age === 1) {
        SoundFX.playSweep(400, 1200, 'sine', 0.4, 0.4);
        SoundFX.playTone(800, 'sine', 0.2, 0.3);
        spawnP(v.cx, v.cy, s.core, 20, 'burst');
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.auroraW * 0.7, life: 12, maxLife: 12, color: s.core });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 150, color: s.core, int: 2.5, life: 8, ml: 8 });
        // Initialize aurora wave points
        v.wavePts = [];
        for (let i = 0; i <= 20; i++) {
          v.wavePts.push({ phase: Math.random() * Math.PI * 2, amp: 0.5 + Math.random() * 0.5 });
        }
      }
      if (v.age > 8) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      // Active shield
      const hw = s.auroraW / 2, hh = s.auroraH / 2;

      // Block enemy projectiles — reflect them back (not player's)
      // Damage enemies that touch
      if (v.age % 8 === 0) {
        for (const e of state.entities) {
          if (!e.active) continue;
          const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
          if (Math.abs(ex - v.cx) < hw && Math.abs(ey - v.cy) < hh) {
            hurtEntity(e, s.auroraDmg, v.cx, v.cy);
            // Push away
            const dx = ex - v.cx, dy = ey - v.cy;
            const d = Math.hypot(dx, dy) || 1;
            e.vx += (dx / d) * 4;
            e.vy += (dy / d) * 3 - 2;
            spawnP(ex, ey, s.core, 3, 'sparkle');
          }
        }
      }
      // Shimmer particles along edges
      if (v.age % 3 === 0) {
        const side = Math.random() > .5 ? 1 : -1;
        const ry = v.cy + (Math.random() - .5) * s.auroraH;
        const colors = [s.color, s.c2, s.core, '#ff99ff', '#99ffdd', '#aaccff'];
        state.particles.push({
          x: v.cx + side * hw * (0.8 + Math.random() * 0.2), y: ry,
          vx: side * 0.5, vy: -0.5 - Math.random(),
          life: 20, ml: 20, color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3, grav: -0.02, type: 'sparkle'
        });
      }
      // Glow
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: s.auroraW * 0.8,
        color: s.core, int: 0.5 + Math.sin(v.age * 0.08) * 0.2, life: 2, ml: 2
      });
      // Fade out sound at end
      if (v.age === s.auroraDur - 30) SoundFX.playSweep(1000, 300, 'sine', 0.2, 0.3);
      if (v.age > s.auroraDur) {
        spawnP(v.cx, v.cy, s.core, 15, 'burst');
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },

  // ─── METEOR SHOWER — sequential devastating sky strikes ───
  'meteor-shower'(v) {
    const s = v.spell;

    if (v.state === 0) {
      // ── Spawn phase: create warning circles then launch meteors ──
      if (v.age === 1) {
        SoundFX.playSweep(80, 400, 'sine', 0.5, 1.0);
        // Pre-calculate meteor targets
        for (let i = 0; i < s.meteorCount; i++) {
          const tx = v.cx + (Math.random() - .5) * s.meteorSpread;
          const ty = v.cy + (Math.random() - .5) * s.meteorSpread * 0.3;
          // Find ground level
          let gy = state.H - 24;
          for (const pl of state.platforms) {
            if (tx > pl.x && tx < pl.x + pl.w && pl.y >= ty) gy = Math.min(gy, pl.y);
          }
          v.meteors.push({
            tx, gy, delay: 15 + i * 10,
            mx: tx - 200 - Math.random() * 100,
            my: -50 - Math.random() * 60,
            active: false, landed: false, age: 0
          });
        }
      }
      // Activate meteors at their delay
      for (const m of v.meteors) {
        if (!m.active && v.age >= m.delay) {
          m.active = true; m.age = 0;
          SoundFX.playSweep(200 + Math.random() * 200, 800, 'sine', 0.3, 0.3);
        }
        if (m.active && !m.landed) {
          m.age++;
          // Warning circle on ground
          if (m.age < 20) {
            state.dynamicLights.push({
              x: m.tx, y: m.gy, r: s.meteorR * (m.age / 20),
              color: '#ff3300', int: 0.5, life: 2, ml: 2
            });
          }
          // Meteor descending
          const flightDur = 20;
          if (m.age >= 10 && m.age < 10 + flightDur) {
            const t = (m.age - 10) / flightDur;
            const curX = m.mx + (m.tx - m.mx) * t;
            const curY = m.my + (m.gy - m.my) * t;
            // Fiery trail
            for (let k = 0; k < 4; k++) {
              state.particles.push({
                x: curX + (Math.random() - .5) * 8,
                y: curY + (Math.random() - .5) * 8,
                vx: -(m.tx - m.mx) * 0.01 + (Math.random() - .5) * 2,
                vy: -(m.gy - m.my) * 0.01 + (Math.random() - .5) * 2,
                life: 15, ml: 15,
                color: k === 0 ? s.core : k === 1 ? s.c2 : s.color,
                size: 3 + Math.random() * 3, grav: 0.02, type: 'ember'
              });
            }
            state.dynamicLights.push({
              x: curX, y: curY, r: 60,
              color: s.core, int: 2, life: 2, ml: 2
            });
          }
          // IMPACT
          if (m.age >= 10 + 20) {
            m.landed = true;
            v.impacted++;
            SoundFX.playNoise(1.0 + Math.random() * 0.5, 0.5, 80, 'lowpass');
            SoundFX.playSweep(200, 60, 'sawtooth', 0.6, 0.3);
            state.shake(15 + Math.random() * 10);
            explode(m.tx, m.gy, s.meteorR, 10, s.dmg, s.color, s.c2);
            // Impact burst
            spawnP(m.tx, m.gy, s.core, 20, 'burst');
            spawnP(m.tx, m.gy, '#ff4422', 15, 'explode');
            // Debris
            for (let k = 0; k < 15; k++) {
              const a = -Math.PI * Math.random();
              state.particles.push({
                x: m.tx + (Math.random() - .5) * 10, y: m.gy,
                vx: Math.cos(a) * (3 + Math.random() * 5),
                vy: Math.sin(a) * (4 + Math.random() * 6),
                life: 50, ml: 50,
                color: k % 3 === 0 ? '#886644' : k % 3 === 1 ? s.color : '#332211',
                size: 3 + Math.random() * 4, grav: 0.2,
                rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.5, type: 'debris'
              });
            }
            // Smoke
            for (let k = 0; k < 6; k++) {
              state.particles.push({
                x: m.tx + (Math.random() - .5) * 20, y: m.gy,
                vx: (Math.random() - .5) * 1.5, vy: -1 - Math.random() * 2,
                life: 60, ml: 60, color: k % 2 ? '#554433' : '#443322',
                size: 6 + Math.random() * 5, grav: -0.02, type: 'smoke'
              });
            }
            state.shockwaves.push({ x: m.tx, y: m.gy, r: 0, maxR: s.meteorR * 1.5, life: 12, maxLife: 12, color: s.core });
            state.dynamicLights.push({ x: m.tx, y: m.gy, r: 150, color: '#ffffff', int: 4, life: 5, ml: 5 });
            state.dynamicLights.push({ x: m.tx, y: m.gy, r: 100, color: s.core, int: 2.5, life: 10, ml: 10 });
          }
        }
      }
      // End when all landed
      if (v.impacted >= s.meteorCount) {
        if (v.age > v.meteors[v.meteors.length - 1].delay + 40) {
          const idx = state.vfxSequences.indexOf(v);
          if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
      }
    }
  },

  // ─── BIG BANG (ULTIMATE) — 5-state cosmic creation event ───
  'big-bang'(v) {
    const s = v.spell;

    if (v.state === 0) {
      // ── Phase 0: Cosmic Gathering — all matter drawn to center ──
      if (v.age === 1) {
        SoundFX.playSweep(40, 200, 'sine', 2.0, 1.5);
        SoundFX.playTone(55, 'sine', 1.5, 2.0);
        state.player.castAnim = 600; state.player.castType = 'up';
        state.player.vx = 0; state.player.vy = 0;
      }
      state.player.vy = -1; state.player.vx = 0;
      // Pull ALL particles, entities, everything toward center
      const pullProg = Math.min(1, v.age / 60);
      for (const e of state.entities) {
        if (!e.active) continue;
        const dx = v.cx - (e.x + e.w / 2), dy = v.cy - (e.y + e.h / 2);
        const dist = Math.hypot(dx, dy) || 1;
        e.vx += (dx / dist) * pullProg * 0.5;
        e.vy += (dy / dist) * pullProg * 0.5;
      }
      // Cosmic dust spiraling in from edges
      if (v.age % 2 === 0) {
        for (let k = 0; k < 5; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = 200 + Math.random() * 150;
          const colors = ['#cc44ff', '#ff66aa', '#4488ff', '#44ffcc', '#ff8844', '#ffffff'];
          state.particles.push({
            x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
            vx: -Math.cos(a) * 5 + Math.cos(a + 1.2) * 3,
            vy: -Math.sin(a) * 5 + Math.sin(a + 1.2) * 3,
            life: 25, ml: 25, color: colors[k % colors.length],
            size: 2 + Math.random() * 3, grav: 0, type: 'sparkle'
          });
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: pullProg * 100, color: '#cc44ff', int: 1 + pullProg * 2, life: 2, ml: 2 });
      state.shake(pullProg * 4);
      if (v.age > 70) { v.state = 1; v.age = 0; }

    } else if (v.state === 1) {
      // ── Phase 1: Singularity — everything compressed to a point ──
      if (v.age === 1) {
        SoundFX.playSweep(800, 40, 'sine', 1.5, 0.5);
        // Violent implosion
        for (let k = 0; k < 30; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = 80 + Math.random() * 60;
          state.particles.push({
            x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
            vx: -Math.cos(a) * 12, vy: -Math.sin(a) * 12,
            life: 6, ml: 6, color: '#ffffff',
            size: 2 + Math.random() * 2, grav: 0, type: 'trail'
          });
        }
        state.shake(20);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 200, maxR: 0, life: 10, maxLife: 10, color: '#ffffff' });
      }
      // Tiny intense point of light — pulsing with massive energy
      const pulse = Math.sin(v.age * 0.5) * 0.5 + 0.5;
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: 10 + pulse * 20,
        color: '#ffffff', int: 5 + pulse * 5, life: 2, ml: 2
      });
      state.shake(8 + v.age);
      // Sound building to critical
      if (v.age === 15) SoundFX.playSweep(60, 3000, 'sawtooth', 2.5, 0.4);
      if (v.age > 25) { v.state = 2; v.age = 0; }

    } else if (v.state === 2) {
      // ── Phase 2: THE BIG BANG — universe-scale explosion ──
      if (v.age === 1) {
        SoundFX.playNoise(4.0, 1.5, 40, 'lowpass');
        SoundFX.playSweep(60, 4000, 'sawtooth', 3.0, 0.8);
        SoundFX.playTone(80, 'square', 1.5, 0.6);
        state.shake(60);
        // Screen-wide white flash
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 800, color: '#ffffff', int: 8, life: 8, ml: 8 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 500, color: '#cc44ff', int: 5, life: 15, ml: 15 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 400, color: '#ff66aa', int: 4, life: 20, ml: 20 });
        // Quintuple shockwave cascade
        for (let i = 0; i < 5; i++) {
          state.shockwaves.push({
            x: v.cx, y: v.cy, r: 0, maxR: s.bangR * (1 - i * 0.15),
            life: 25 - i * 3, maxLife: 25 - i * 3,
            color: i === 0 ? '#ffffff' : i === 1 ? '#cc44ff' : i === 2 ? '#ff66aa' : i === 3 ? '#4488ff' : '#44ffcc'
          });
        }
        // Damage everything in massive radius
        for (const e of state.entities) {
          if (!e.active) continue;
          const dx = e.x + e.w / 2 - v.cx, dy = e.y + e.h / 2 - v.cy;
          const dist = Math.hypot(dx, dy);
          if (dist < s.bangR) {
            const pct = 1 - dist / s.bangR;
            hurtEntity(e, Math.floor(s.dmg * (0.4 + pct * 0.6)), v.cx, v.cy);
            const nDist = dist || 1;
            e.vx = (dx / nDist) * 25 * pct;
            e.vy = (dy / nDist) * 25 * pct - 10;
            if (e.rotV !== undefined) e.rotV += (Math.random() - .5) * 5;
          }
        }
        state.player.inv = false;
        state.player.castAnim = 0;
        // Massive multicolor particle explosion — 120 particles in expanding ring
        for (let k = 0; k < 120; k++) {
          const a = (k / 120) * Math.PI * 2 + (Math.random() - .5) * 0.3;
          const spd = 5 + Math.random() * 12;
          const colors = ['#cc44ff', '#ff66aa', '#4488ff', '#44ffcc', '#ff8844', '#ffdd66', '#ffffff', '#ff4466'];
          state.particles.push({
            x: v.cx, y: v.cy,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2,
            life: 50 + Math.random() * 50, ml: 100,
            color: colors[k % colors.length],
            size: 2 + Math.random() * 5, grav: 0.02,
            rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.3,
            type: k < 40 ? 'burst' : k < 80 ? 'explode' : 'ember'
          });
        }
        // Nebula gas clouds — large slow-moving
        const nebulaColors = ['#cc44ff88', '#ff66aa88', '#4488ff88', '#44ffcc88'];
        for (let k = 0; k < 20; k++) {
          const a = (k / 20) * Math.PI * 2;
          const spd = 2 + Math.random() * 3;
          state.particles.push({
            x: v.cx + Math.cos(a) * 10, y: v.cy + Math.sin(a) * 10,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.5,
            life: 100 + Math.random() * 60, ml: 160,
            color: nebulaColors[k % nebulaColors.length],
            size: 12 + Math.random() * 10, grav: -0.005, type: 'cloud'
          });
        }
        // Spawn persistent stars
        for (let k = 0; k < 25; k++) {
          v.stars.push({
            x: v.cx + (Math.random() - .5) * s.bangR * 1.5,
            y: v.cy + (Math.random() - .5) * s.bangR,
            brightness: Math.random(),
            twinkle: Math.random() * Math.PI * 2,
            size: 1 + Math.random() * 2
          });
        }
      }
      // Continuing expansion — aftershock particles
      if (v.age % 4 === 0 && v.age < 40) {
        for (let k = 0; k < 6; k++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 3 + Math.random() * 6;
          const colors = ['#cc44ff', '#ff66aa', '#4488ff', '#44ffcc'];
          state.particles.push({
            x: v.cx + Math.cos(a) * v.age * 3,
            y: v.cy + Math.sin(a) * v.age * 3,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: 30, ml: 30, color: colors[k % colors.length],
            size: 2 + Math.random() * 3, grav: 0, type: 'sparkle'
          });
        }
        state.shake(Math.max(0, 30 - v.age));
      }
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: Math.min(v.age * 8, 400),
        color: '#cc44ff', int: Math.max(0.5, 4 - v.age / 10), life: 2, ml: 2
      });
      if (v.age > 60) { v.state = 3; v.age = 0; }

    } else if (v.state === 3) {
      // ── Phase 3: Nebula aftermath — lingering cosmic beauty ──
      // Twinkling stars remain
      for (const star of v.stars) {
        star.twinkle += 0.08 + star.brightness * 0.05;
        const b = 0.3 + Math.sin(star.twinkle) * 0.3;
        if (b > 0.3 && v.age % 3 === 0) {
          state.dynamicLights.push({
            x: star.x, y: star.y, r: 8 + star.size * 3,
            color: '#ffffff', int: b, life: 3, ml: 3
          });
        }
      }
      // Fading nebula wisps
      if (v.age % 8 === 0 && v.age < s.bangDur - 60) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 150;
        const colors = ['#cc44ff44', '#ff66aa44', '#4488ff44'];
        state.particles.push({
          x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
          vx: (Math.random() - .5) * 0.5, vy: -0.2,
          life: 50, ml: 50, color: colors[Math.floor(Math.random() * colors.length)],
          size: 6 + Math.random() * 6, grav: -0.005, type: 'cloud'
        });
      }
      // Gentle glow fading
      const fade = Math.max(0, 1 - v.age / s.bangDur);
      state.dynamicLights.push({
        x: v.cx, y: v.cy, r: 200 * fade,
        color: '#cc44ff', int: fade, life: 2, ml: 2
      });
      if (v.age > s.bangDur) {
        const idx = state.vfxSequences.indexOf(v);
        if (idx !== -1) state.vfxSequences.splice(idx, 1);
      }
    }
  },
};

// ── VFX Draw Handlers ──────────────────────────────────────────────────────
export const VFX_DRAW = {
  ...MANIFEST_VFX_DRAW,

  // ─── STAR COLLAPSE — glowing star with accretion disk ───
  'star-collapse'(v, X) {
    const s = v.spell;
    const T = performance.now() * 0.001;

    if (v.state === 0) {
      // Forming — growing light sphere
      const pr = Math.min(1, v.age / 30);
      const r = 5 + pr * 15;
      // Soft outer glow
      const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r * 4);
      g.addColorStop(0, s.core); g.addColorStop(0.2, s.c2 + 'aa');
      g.addColorStop(0.5, s.color + '44'); g.addColorStop(1, 'transparent');
      X.fillStyle = g; X.globalAlpha = 0.6 * pr;
      X.beginPath(); X.arc(v.cx, v.cy, r * 4, 0, Math.PI * 2); X.fill();
      // Core
      X.fillStyle = '#ffffff'; X.globalAlpha = 0.8 * pr;
      X.beginPath(); X.arc(v.cx, v.cy, r * 0.5, 0, Math.PI * 2); X.fill();
      X.globalAlpha = 1;

    } else if (v.state === 1) {
      // Active star with accretion disk
      const prog = Math.min(1, v.age / s.starChargeT);
      const r = 15 + prog * 5;
      const pulse = Math.sin(T * 3) * 0.15 + 0.85;

      // Accretion disk — elliptical ring
      X.save(); X.translate(v.cx, v.cy);
      // Disk glow
      for (let ring = 3; ring >= 0; ring--) {
        const rr = (r * 2 + ring * 12) * pulse;
        const g = X.createRadialGradient(0, 0, rr * 0.5, 0, 0, rr);
        g.addColorStop(0, 'transparent');
        g.addColorStop(0.6, (ring % 2 ? s.c2 : s.color) + '33');
        g.addColorStop(0.9, (ring % 2 ? s.color : s.c2) + '22');
        g.addColorStop(1, 'transparent');
        X.fillStyle = g; X.globalAlpha = 0.4;
        X.beginPath(); X.ellipse(0, 0, rr, rr * 0.3, T * 0.5, 0, Math.PI * 2); X.fill();
      }
      // Spinning accretion streams
      X.globalAlpha = 0.35;
      for (let arm = 0; arm < 4; arm++) {
        X.strokeStyle = arm % 2 ? s.c2 : s.color;
        X.lineWidth = 1.5;
        X.beginPath();
        for (let t = 0; t < 40; t++) {
          const a = (arm / 4) * Math.PI * 2 + T * 2 + t * 0.12;
          const sr = r + (t / 40) * r * 2.5;
          const x = Math.cos(a) * sr;
          const y = Math.sin(a) * sr * 0.3;
          t === 0 ? X.moveTo(x, y) : X.lineTo(x, y);
        }
        X.stroke();
      }
      X.restore();

      // Star core — layered gradients
      const cg = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.3, s.core);
      cg.addColorStop(0.7, s.c2);
      cg.addColorStop(1, s.color + '00');
      X.fillStyle = cg; X.globalAlpha = 0.9;
      X.beginPath(); X.arc(v.cx, v.cy, r * pulse, 0, Math.PI * 2); X.fill();

      // Corona spikes
      X.globalAlpha = 0.3;
      for (let spike = 0; spike < 8; spike++) {
        const sa = (spike / 8) * Math.PI * 2 + T * 1.5;
        const sLen = r * (1.5 + Math.sin(T * 4 + spike * 2.5) * 0.5);
        const sg = X.createLinearGradient(
          v.cx, v.cy,
          v.cx + Math.cos(sa) * sLen, v.cy + Math.sin(sa) * sLen
        );
        sg.addColorStop(0, s.core); sg.addColorStop(1, 'transparent');
        X.strokeStyle = sg; X.lineWidth = 2;
        X.beginPath(); X.moveTo(v.cx, v.cy);
        X.lineTo(v.cx + Math.cos(sa) * sLen, v.cy + Math.sin(sa) * sLen);
        X.stroke();
      }

      // Pull radius indicator (faint)
      const pullR = s.starR * (0.5 + prog * 0.5);
      X.strokeStyle = s.color; X.lineWidth = 1; X.globalAlpha = 0.08;
      X.setLineDash([3, 6]);
      X.beginPath(); X.arc(v.cx, v.cy, pullR, 0, Math.PI * 2); X.stroke();
      X.setLineDash([]);
      X.globalAlpha = 1;

    } else if (v.state === 2) {
      // Collapsing — shrinking intense point
      const cProg = Math.min(1, v.age / s.starCollapseT);
      const r = 20 * (1 - cProg * 0.95);
      const g = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r * 3);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, s.core); g.addColorStop(1, 'transparent');
      X.fillStyle = g; X.globalAlpha = 0.9;
      X.beginPath(); X.arc(v.cx, v.cy, r * 3, 0, Math.PI * 2); X.fill();
      X.fillStyle = '#ffffff'; X.globalAlpha = 1;
      X.beginPath(); X.arc(v.cx, v.cy, r, 0, Math.PI * 2); X.fill();
      X.globalAlpha = 1;

    } else if (v.state === 3) {
      // Explosion flash
      if (v.age < 6) {
        X.fillStyle = '#ffffff'; X.globalAlpha = Math.max(0, 0.7 - v.age / 8);
        X.fillRect(0, 0, state.W, state.H);
      }
      X.globalAlpha = 1;
    }
  },

  // ─── AURORA VEIL — flowing multi-color cosmic curtain ───
  'aurora-veil'(v, X) {
    if (v.state !== 1) return;
    const s = v.spell;
    const T = performance.now() * 0.001;
    const hw = s.auroraW / 2, hh = s.auroraH / 2;
    const fade = Math.min(1, v.age / 10) * Math.min(1, (s.auroraDur - v.age) / 20);

    X.save(); X.translate(v.cx, v.cy);

    // Draw multiple flowing aurora bands
    const bands = [
      { color1: '#44ffaa', color2: '#22cc77', yOff: -0.3, amp: 12, freq: 2.5, alpha: 0.25 },
      { color1: '#ff66dd', color2: '#cc44aa', yOff: 0, amp: 15, freq: 2.0, alpha: 0.2 },
      { color1: '#aaddff', color2: '#6699cc', yOff: 0.2, amp: 10, freq: 3.0, alpha: 0.22 },
      { color1: '#ffcc44', color2: '#cc9922', yOff: -0.15, amp: 8, freq: 3.5, alpha: 0.15 },
      { color1: '#cc88ff', color2: '#9944cc', yOff: 0.1, amp: 13, freq: 2.2, alpha: 0.18 },
    ];

    for (const band of bands) {
      const pts = 30;
      X.globalAlpha = band.alpha * fade;
      // Draw flowing curtain shape
      X.beginPath();
      // Top edge — wavy
      for (let i = 0; i <= pts; i++) {
        const t = i / pts;
        const x = -hw + t * s.auroraW;
        const waveY = Math.sin(t * Math.PI * band.freq + T * 1.5 + band.yOff * 10) * band.amp;
        const y = -hh + band.yOff * hh + waveY;
        if (i === 0) X.moveTo(x, y); else X.lineTo(x, y);
      }
      // Bottom edge — different wave
      for (let i = pts; i >= 0; i--) {
        const t = i / pts;
        const x = -hw + t * s.auroraW;
        const waveY = Math.sin(t * Math.PI * band.freq * 0.8 + T * 1.2 + band.yOff * 8 + 2) * band.amp * 0.7;
        const y = -hh + band.yOff * hh + hh * 0.5 + waveY;
        X.lineTo(x, y);
      }
      X.closePath();
      // Gradient fill
      const bg = X.createLinearGradient(-hw, 0, hw, 0);
      bg.addColorStop(0, 'transparent');
      bg.addColorStop(0.15, band.color1);
      bg.addColorStop(0.5, band.color2);
      bg.addColorStop(0.85, band.color1);
      bg.addColorStop(1, 'transparent');
      X.fillStyle = bg; X.fill();
    }

    // Sparkle points along the aurora
    X.globalAlpha = fade * 0.6;
    for (let k = 0; k < 12; k++) {
      const kx = (Math.sin(T * 0.7 + k * 2.1) * 0.8) * hw;
      const ky = (Math.cos(T * 0.9 + k * 1.7) * 0.6) * hh;
      const bright = 0.5 + Math.sin(T * 3 + k * 4.3) * 0.5;
      if (bright > 0.4) {
        const sr = 2 + bright * 2;
        X.fillStyle = '#ffffff'; X.globalAlpha = fade * bright * 0.5;
        X.beginPath(); X.arc(kx, ky, sr, 0, Math.PI * 2); X.fill();
        // Cross sparkle
        X.strokeStyle = '#ffffff'; X.lineWidth = 0.8;
        X.beginPath(); X.moveTo(kx - sr * 2, ky); X.lineTo(kx + sr * 2, ky); X.stroke();
        X.beginPath(); X.moveTo(kx, ky - sr * 2); X.lineTo(kx, ky + sr * 2); X.stroke();
      }
    }

    // Outer border glow
    X.strokeStyle = s.core; X.lineWidth = 1.5; X.globalAlpha = fade * 0.15;
    X.strokeRect(-hw, -hh, s.auroraW, s.auroraH);

    X.restore(); X.globalAlpha = 1;
  },

  // ─── METEOR SHOWER — warning circles on ground ───
  'meteor-shower'(v, X) {
    const s = v.spell;
    if (!v.meteors) return;

    for (const m of v.meteors) {
      if (!m.active) continue;
      // Warning circle
      if (!m.landed && m.age < 30) {
        const pr = Math.min(1, m.age / 15);
        // Pulsing red warning circle
        X.strokeStyle = '#ff3300'; X.lineWidth = 2;
        X.globalAlpha = (0.3 + Math.sin(m.age * 0.5) * 0.15) * pr;
        X.setLineDash([4, 4]);
        X.beginPath(); X.arc(m.tx, m.gy, s.meteorR * pr, 0, Math.PI * 2); X.stroke();
        X.setLineDash([]);
        // Fill
        const wg = X.createRadialGradient(m.tx, m.gy, 0, m.tx, m.gy, s.meteorR * pr);
        wg.addColorStop(0, '#ff330033'); wg.addColorStop(1, 'transparent');
        X.fillStyle = wg; X.globalAlpha = 0.2 * pr;
        X.beginPath(); X.arc(m.tx, m.gy, s.meteorR * pr, 0, Math.PI * 2); X.fill();
        // Crosshair
        X.strokeStyle = '#ff3300'; X.lineWidth = 1; X.globalAlpha = 0.3 * pr;
        X.beginPath(); X.moveTo(m.tx - s.meteorR * pr, m.gy); X.lineTo(m.tx + s.meteorR * pr, m.gy); X.stroke();
        X.beginPath(); X.moveTo(m.tx, m.gy - s.meteorR * pr); X.lineTo(m.tx, m.gy + s.meteorR * pr); X.stroke();
      }
      // Draw the meteor itself while in flight
      if (m.active && !m.landed && m.age >= 10 && m.age < 30) {
        const t = (m.age - 10) / 20;
        const mx = m.mx + (m.tx - m.mx) * t;
        const my = m.my + (m.gy - m.my) * t;
        // Meteor body
        const mg = X.createRadialGradient(mx, my, 0, mx, my, 8);
        mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.3, s.core); mg.addColorStop(1, s.color + '00');
        X.fillStyle = mg; X.globalAlpha = 0.9;
        X.beginPath(); X.arc(mx, my, 8, 0, Math.PI * 2); X.fill();
        // Tail
        const tailAngle = Math.atan2(m.gy - m.my, m.tx - m.mx) + Math.PI;
        const tg = X.createLinearGradient(mx, my, mx + Math.cos(tailAngle) * 40, my + Math.sin(tailAngle) * 40);
        tg.addColorStop(0, s.color + 'cc'); tg.addColorStop(1, 'transparent');
        X.strokeStyle = tg; X.lineWidth = 4; X.globalAlpha = 0.7;
        X.beginPath(); X.moveTo(mx, my);
        X.lineTo(mx + Math.cos(tailAngle) * 40, my + Math.sin(tailAngle) * 40);
        X.stroke();
        // Glow
        X.fillStyle = s.core + '44'; X.globalAlpha = 0.4;
        X.beginPath(); X.arc(mx, my, 20, 0, Math.PI * 2); X.fill();
      }
      // Impact flash
      if (m.landed && m.age < (m.age + 5)) {
        // Already handled by particles/shockwaves in update
      }
    }
    X.globalAlpha = 1;
  },

  // ─── BIG BANG — screen-wide cosmic draw effects ───
  'big-bang'(v, X) {
    const s = v.spell;
    const T = performance.now() * 0.001;

    if (v.state === 0) {
      // Gathering — dark vignette closing in
      const pr = Math.min(1, v.age / 70);
      // Screen darkening vignette
      const vg = X.createRadialGradient(v.cx, v.cy, 50 * (1 - pr), v.cx, v.cy, 300);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(0.6, 'rgba(0,0,10,' + (pr * 0.3) + ')');
      vg.addColorStop(1, 'rgba(0,0,10,' + (pr * 0.5) + ')');
      X.fillStyle = vg; X.globalAlpha = 1;
      X.fillRect(0, 0, state.W, state.H);
      // Convergence point glow
      const cg = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, 30 * pr);
      cg.addColorStop(0, '#cc44ff'); cg.addColorStop(0.5, '#4488ff44'); cg.addColorStop(1, 'transparent');
      X.fillStyle = cg; X.globalAlpha = pr * 0.6;
      X.beginPath(); X.arc(v.cx, v.cy, 30 * pr, 0, Math.PI * 2); X.fill();
      X.globalAlpha = 1;

    } else if (v.state === 1) {
      // Singularity — extreme darkness except center
      X.fillStyle = 'rgba(0,0,10,0.4)';
      X.fillRect(0, 0, state.W, state.H);
      // Intense white point
      const pulse = Math.sin(v.age * 0.5) * 0.3 + 0.7;
      const cg = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, 8);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.5, '#cc44ff'); cg.addColorStop(1, 'transparent');
      X.fillStyle = cg; X.globalAlpha = pulse;
      X.beginPath(); X.arc(v.cx, v.cy, 8, 0, Math.PI * 2); X.fill();
      // Energy arcs around singularity
      X.strokeStyle = '#cc44ff'; X.lineWidth = 1.5; X.globalAlpha = 0.5;
      for (let arc = 0; arc < 4; arc++) {
        const aStart = T * 3 + arc * Math.PI / 2;
        X.beginPath(); X.arc(v.cx, v.cy, 15 + arc * 3, aStart, aStart + Math.PI * 0.6); X.stroke();
      }
      X.globalAlpha = 1;

    } else if (v.state === 2) {
      // Explosion — white flash then cosmic colors
      if (v.age < 10) {
        X.fillStyle = '#ffffff'; X.globalAlpha = Math.max(0, 0.8 - v.age / 12);
        X.fillRect(0, 0, state.W, state.H);
      }
      // Expanding nebula ring
      if (v.age > 5 && v.age < 50) {
        const ringR = v.age * 6;
        const rw = 20 + v.age;
        X.globalAlpha = Math.max(0, 0.3 - v.age / 200);
        // Multi-color nebula ring
        const colors = ['#cc44ff', '#ff66aa', '#4488ff', '#44ffcc'];
        for (let i = 0; i < colors.length; i++) {
          const offset = i * 0.02;
          const ng = X.createRadialGradient(v.cx, v.cy, Math.max(0, ringR - rw), v.cx, v.cy, ringR + rw);
          ng.addColorStop(0, 'transparent');
          ng.addColorStop(0.3 + offset, colors[i] + '44');
          ng.addColorStop(0.5 + offset, colors[i] + '22');
          ng.addColorStop(0.7, 'transparent');
          ng.addColorStop(1, 'transparent');
          X.fillStyle = ng;
          X.beginPath(); X.arc(v.cx, v.cy, ringR + rw, 0, Math.PI * 2); X.fill();
        }
      }
      X.globalAlpha = 1;

    } else if (v.state === 3) {
      // Aftermath — twinkling stars
      const fade = Math.max(0, 1 - v.age / s.bangDur);
      for (const star of v.stars) {
        const b = 0.3 + Math.sin(star.twinkle) * 0.3;
        if (b > 0.3) {
          const sr = star.size;
          X.fillStyle = '#ffffff'; X.globalAlpha = b * fade * 0.6;
          X.beginPath(); X.arc(star.x, star.y, sr, 0, Math.PI * 2); X.fill();
          // Cross sparkle on bright stars
          if (b > 0.5 && star.size > 1.5) {
            X.strokeStyle = '#ffffff'; X.lineWidth = 0.5; X.globalAlpha = b * fade * 0.3;
            X.beginPath(); X.moveTo(star.x - sr * 3, star.y); X.lineTo(star.x + sr * 3, star.y); X.stroke();
            X.beginPath(); X.moveTo(star.x, star.y - sr * 3); X.lineTo(star.x, star.y + sr * 3); X.stroke();
          }
        }
      }
      X.globalAlpha = 1;
    }
  },
};
