// ═══════════════════════════════════════════════════════════════════════════
// water.js — Water & Ice Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode, isEnemyEntity } from '../core/utils.js?v=8';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';

const W = 1200, H = 800; // Expected canvas size

// ── Shared visual helpers (premium additive blending) ─────────────────────
function addLightGlow(X, x, y, r, c1, c2, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c1);
  g.addColorStop(0.45, c2);
  g.addColorStop(1, 'transparent');
  X.fillStyle = g;
  X.globalAlpha = alpha;
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fill();
  X.restore();
  X.globalAlpha = 1;
}

function addLightBeam(X, x1, y1, x2, y2, w, c1, c2, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, c1);
  g.addColorStop(0.5, c2);
  g.addColorStop(1, 'transparent');
  X.strokeStyle = g;
  X.lineWidth = w;
  X.lineCap = 'round';
  X.globalAlpha = alpha;
  X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke();
  X.restore();
  X.globalAlpha = 1;
}

function drawCausticRing(X, cx, cy, r, color, alpha = 0.6, ellipseY = 0.4) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  X.strokeStyle = color;
  X.lineWidth = 1.4;
  X.globalAlpha = alpha;
  X.beginPath();
  X.ellipse(cx, cy, r, r * ellipseY, 0, 0, Math.PI * 2);
  X.stroke();
  X.restore();
  X.globalAlpha = 1;
}

function drawIceCrystal(X, cx, cy, r, rot, c1, c2, alpha = 1) {
  X.save();
  X.translate(cx, cy);
  X.rotate(rot);
  X.globalAlpha = alpha;
  const g = X.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, c1);
  g.addColorStop(1, c2);
  X.fillStyle = g;
  X.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.55;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) X.moveTo(px, py); else X.lineTo(px, py);
  }
  X.closePath();
  X.fill();
  X.strokeStyle = c2;
  X.lineWidth = 0.8;
  X.globalAlpha = alpha * 0.7;
  X.stroke();
  X.restore();
  X.globalAlpha = 1;
}

function drawWaterWave(X, cx, cy, w, h, phase, c1, c2, alpha = 1) {
  X.save();
  X.globalAlpha = alpha;
  const g = X.createLinearGradient(0, cy - h, 0, cy + h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, c1);
  g.addColorStop(1, c2);
  X.fillStyle = g;
  X.beginPath();
  X.moveTo(cx - w / 2, cy + h);
  const segs = 14;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const wx = cx - w / 2 + t * w;
    const wy = cy - Math.sin(t * Math.PI) * h * 0.9 + Math.sin(t * 7 + phase) * h * 0.18;
    X.lineTo(wx, wy);
  }
  X.lineTo(cx + w / 2, cy + h);
  X.closePath();
  X.fill();
  X.restore();
  X.globalAlpha = 1;
}

export const SPELL_DEFS = [
    { name: 'Tsunami', icon: '🌊', key: 'F', color: '#1166dd', c2: '#44aadd', core: '#cceeff', speed: 0, dmg: 46, mana: 48, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isTsunami: true, waveCount: 3, waveSpread: 320, desc: 'Three-wave sweeping cataclysm with foam crest' },
    { name: 'Hydra Heads', icon: '🐉', key: 'P', color: '#1188aa', c2: '#44bbdd', core: '#ffffff', speed: 0, dmg: 15, mana: 35, cd: 1500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isHydra: true, hydraDur: 180, hydraHeads: 3, hydraRange: 140, desc: 'Water serpent heads emerge and auto-bite nearby foes' },
    { name: 'Maelstrom', icon: '🌀', key: 'O', color: '#0a3a7a', c2: '#3a8edd', core: '#aaeeff', speed: 0, dmg: 18, mana: 55, cd: 2200, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isMaelstrom: true, maelR: 180, pullDur: 60, gatherDur: 90, columnDur: 70, desc: 'Three-stage devastation — pulls shots, then enemies, then erupts in tidal column' },
    { name: 'Tidal Surf', icon: '🏄', key: 'X', category: 'Dash', color: '#3aaaff', c2: '#9be7ff', core: '#ffffff', speed: 0, dmg: 0, mana: 24, cd: 760, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isAquaticSurge: true, surgeRange: 270, surgeDur: 30, surfHold: 16, desc: 'Hold-style surf dash that lifts the caster onto a curling wave' },
    createHoldSpell({
        name: 'Tide Harness', icon: '🫧', key: 'A',
        color: '#3e8eff', c2: '#9beeff', core: '#ffffff',
        mana: 18, cd: 880, dmg: 0,
        holdStyle: 'water', holdProfile: 'water_undertow',
        holdR: 76, holdDrain: 0.2, holdForce: 0.24, holdLift: 0.65,
        releaseR: 86, releaseDmg: 0,
        desc: 'Hold to suspend targets inside a rotating undertow and slam them down on release'
    }),
];

// Defs herdados pela escola Ice (handlers/VFX continuam neste módulo;
// o registry funde FIRE_HANDLERS/PROJ_HOOKS/VFX_* globalmente).
export const ICE_SPELL_DEFS = [
    { name: 'Ice Lance', icon: '❄️', key: '1', color: '#44ccff', c2: '#88eeff', core: '#eeffff', speed: 14, dmg: 15, mana: 8, cd: 170, r: 3, grav: .01, drag: 1, bounce: 2, exR: 0, exF: 0, trail: 'ice', piercing: true, desc: 'Fast piercing, bounces walls' },
    { name: 'Frost Nova', icon: '❆', key: '2', color: '#66ddff', c2: '#99eeff', core: '#fff', speed: 0, dmg: 12, mana: 20, cd: 500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isFrostNova: true, frostR: 80, frostSlow: 120, desc: 'Freezes all nearby enemies' },
    { name: 'Chain Frost', icon: '💎', key: '3', color: '#88eeff', c2: '#aaf4ff', core: '#fff', speed: 6, dmg: 18, mana: 18, cd: 500, r: 4, grav: .05, drag: .999, bounce: 5, exR: 22, exF: 4, trail: 'frost', chain: 3, chainR: 130, desc: 'Chains between targets' },
    { name: 'Permafrost', icon: '🧊', key: '4', color: '#aaddff', c2: '#ddeeff', core: '#ffffff', speed: 0, dmg: 5, mana: 22, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isPermafrost: true, frostW: 160, frostDur: 300, desc: 'Icy ground slows enemies' },
    createManifestSpell({
        name: 'Glacier Path', icon: '🧊',
        color: '#52cfff', c2: '#a2f0ff', core: '#ffffff',
        manifestStyle: 'water', manifestEffect: 'water_chill', manifestProfile: 'ice_bridge', manifestGlyph: '*',
        manifestDuration: 900,
        mana: 24, cd: 900, manifestArc: 14, manifestThickness: 12, manifestSegmentHp: 34,
        desc: 'Manifest an ice span that chills foes, feeds mana, and slowly melts away'
    }),
    { name: 'Absolute Zero', icon: '❄️', key: '0', color: '#88eeff', c2: '#ccffff', core: '#ffffff', speed: 0, dmg: 40, mana: 70, cd: 6000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isAbsoluteZero: true, desc: 'Freezes entire screen (Ultimate)' },
];

export const FIRE_HANDLERS = {
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    isFrostNova: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'frostnova', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, spell: s });
        return true;
    },
    isGeyser: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'geyser', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isTsunami: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'tsunami', state: 0, age: 0, cx: state.player.x + state.player.w / 2 - state.player.facing * 40, cy: state.player.y + state.player.h / 2, facing: state.player.facing, spell: s });
        return true;
    },
    isTidalPrison: (s, ox, oy, tx, ty) => {
        let closest = null, minD = 220;
        for (const e of state.entities) {
            if (!isEnemyEntity(e)) continue;
            const d = Math.hypot(e.x + e.w / 2 - tx, e.y + e.h / 2 - ty);
            if (d < minD) { minD = d; closest = e; }
        }
        if (closest) {
            state.vfxSequences.push({
                type: 'tidal_prison', state: 0, age: 0,
                target: closest, tx: closest.x + closest.w / 2, ty: closest.y + closest.h / 2,
                spell: s, drops: [], phase: Math.random() * Math.PI * 2,
            });
            SoundFX.playSweep(220, 520, 'sine', 0.45, 0.35);
            SoundFX.playNoise(0.35, 0.3, 240, 'lowpass');
            spawnP(closest.x + closest.w / 2, closest.y + closest.h / 2, s.core, 14, 'sparkle');
            state.dynamicLights.push({ x: closest.x + closest.w / 2, y: closest.y + closest.h / 2, r: 80, color: s.core, int: 2, life: 10, ml: 10 });
        } else {
            spawnP(tx, ty, s.color, 10, 'burst');
            SoundFX.playTone(220, 'sine', 0.12, 0.18);
        }
        return true;
    },
    isMaelstrom: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({
            type: 'maelstrom', state: 0, age: 0,
            cx: tx, cy: ty, spell: s,
            pulled: [], absorbed: 0,
        });
        SoundFX.playSweep(80, 280, 'sine', 1.6, 0.7);
        SoundFX.playNoise(0.6, 0.5, 160, 'lowpass');
        spawnP(tx, ty, s.core, 24, 'burst');
        spawnP(tx, ty, s.c2, 18, 'sparkle');
        state.shockwaves.push({ x: tx, y: ty, r: 0, maxR: 60, life: 18, maxLife: 18, color: s.core });
        state.dynamicLights.push({ x: tx, y: ty, r: 140, color: s.core, int: 2.6, life: 14, ml: 14 });
        state.shake(8);
        return true;
    },
    isAquaticSurge: (s, ox, oy, tx, ty) => {
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const ang = Math.atan2(ty - py, tx - px);
        const range = s.surgeRange || 240;
        const dur = s.surgeDur || 28;
        state.vfxSequences.push({
            type: 'aquatic_surge', state: 0, age: 0,
            startX: px, startY: py,
            dx: Math.cos(ang), dy: Math.sin(ang),
            angle: ang, range, dur,
            hold: s.surfHold || 16,
            hitList: new Set(), trail: [], spray: [], spell: s,
        });
        player.vx *= 0.25;
        player.vy *= 0.25;
        SoundFX.playSweep(280, 760, 'sine', 0.6, 0.32);
        SoundFX.playNoise(0.5, 0.3, 320, 'highpass');
        spawnP(px, py, s.core, 18, 'burst');
        state.dynamicLights.push({ x: px, y: py, r: 90, color: s.core, int: 2.2, life: 10, ml: 10 });
        state.shake(4);
        return true;
    },
    isRain: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'rain', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isWhirlpool: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'whirlpool', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isAbsoluteZero: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'absolute_zero', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, spell: s });
        state.player.inv = true;
        return true;
    },
    isRiptide: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'riptide', state: 0, age: 0, ox, oy, tx, ty, spell: s });
        return true;
    },
    isDepthCharge: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'depth_charge', state: 0, age: 0, tx, ty, x: tx, y: Math.max(40, ty - 120), vy: 0, spell: s, wobble: Math.random() * Math.PI * 2 });
        return true;
    },
    isHydra: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'hydra', state: 0, age: 0, cx: tx, cy: ty, spell: s, heads: [] });
        return true;
    },
    isMirrorPool: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'mirror_pool', state: 0, age: 0, tx, ty, spell: s, mirrored: 0 });
        return true;
    },
    isPermafrost: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'permafrost', state: 0, age: 0, tx, ty, spell: s });
        spawnP(tx, ty, s.color, 12, 'burst');
        SoundFX.playTone(600, 'sine', 0.2, 0.2);
        return true;
    },
    isTidalLink(s, ox, oy, tx, ty) {
        const anchor = state.vfxSequences.find(v => v.type === 'tidal_link' && v.state === 0);
        if (anchor) {
            // Second click — create tether
            anchor.state = 1;
            anchor.age = 0;
            anchor.bx = tx;
            anchor.by = ty;
            SoundFX.playSweep(400, 800, 'sine', 0.3, 0.3);
            spawnP(tx, ty, s.color, 8, 'burst');
        } else {
            // First click — place anchor
            state.vfxSequences.push({ type: 'tidal_link', state: 0, age: 0, ax: tx, ay: ty, bx: 0, by: 0, spell: s });
            SoundFX.playTone(500, 'sine', 0.2, 0.15);
            spawnP(tx, ty, s.color, 6, 'sparkle');
        }
        return true;
    }
};

export const PROJ_HOOKS = {
    isSteamVent: {
        onLand(p, s, hitPlat, hitEntity) {
            state.vfxSequences.push({ type: 'steam_vent', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
            spawnP(p.x, p.y, s.color, 15, 'burst');
        }
    }
};
export const TRAIL_EMITTERS = {};

function removeWaterVfx(v) {
    const idx = state.vfxSequences.indexOf(v);
    if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function findGroundY(x, y) {
    let gy = state.H - 24;
    for (const p of state.platforms) {
        if (x > p.x && x < p.x + p.w && y <= p.y) gy = Math.min(gy, p.y);
    }
    return gy;
}

function distToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return {
        t,
        x: cx,
        y: cy,
        dist: Math.hypot(px - cx, py - cy),
    };
}

function cloneProjectile(p, x, y, vx, vy) {
    return {
        ...p,
        x,
        y,
        vx,
        vy,
        age: 0,
        life: Math.max(36, Math.floor((p.life || 80) * 0.72)),
        trail: [],
        hitList: [],
        _mirrorEchoed: true,
        _fromMirrorPool: true,
    };
}

function acquireHydraTarget(x, y, range, claimed) {
    let target = null;
    let best = range;
    for (const e of state.entities) {
        if (!isEnemyEntity(e) || claimed.includes(e)) continue;
        const dist = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
        if (dist < best) {
            best = dist;
            target = e;
        }
    }
    return target;
}

export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    'tidal_link': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            // Anchor waiting — pulsing point
            if (v.age % 4 === 0) spawnP(v.ax + (Math.random()-.5)*10, v.ay + (Math.random()-.5)*10, s.color, 1, 'sparkle');
            // Auto-expire if not connected in 300 frames
            if (v.age > 300) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        } else if (v.state === 1) {
            // Active tether — damage enemies crossing the line
            if (v.age % 8 === 0) {
                const ax = v.ax, ay = v.ay, bx = v.bx, by = v.by;
                const dx = bx - ax, dy = by - ay;
                const len = Math.hypot(dx, dy) || 1;
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const ex = e.x + e.w/2, ey = e.y + e.h/2;
                    // Distance from point to line segment
                    const t = Math.max(0, Math.min(1, ((ex - ax) * dx + (ey - ay) * dy) / (len * len)));
                    const closestX = ax + dx * t, closestY = ay + dy * t;
                    const d = Math.hypot(ex - closestX, ey - closestY);
                    if (d < 20) {
                        hurtEntity(e, s.dmg, closestX, closestY);
                        spawnP(ex, ey, s.c2, 4, 'burst');
                        // Push perpendicular to tether
                        const perpX = -dy / len, perpY = dx / len;
                        const side = (ex - closestX) * perpX + (ey - closestY) * perpY > 0 ? 1 : -1;
                        e.vx += perpX * 3 * side;
                        e.vy += perpY * 3 * side - 1;
                    }
                }
            }
            // Water flow particles along tether
            if (v.age % 2 === 0) {
                const t = (v.age % 30) / 30;
                const fx = v.ax + (v.bx - v.ax) * t;
                const fy = v.ay + (v.by - v.ay) * t;
                state.particles.push({
                    x: fx + (Math.random()-.5)*6, y: fy + (Math.random()-.5)*6,
                    vx: (v.bx - v.ax) * 0.02, vy: (v.by - v.ay) * 0.02,
                    life: 10, ml: 10, color: s.c2, size: 2 + Math.random(), grav: 0, type: 'trail'
                });
            }
            state.dynamicLights.push({ x: (v.ax+v.bx)/2, y: (v.ay+v.by)/2, r: Math.hypot(v.bx-v.ax, v.by-v.ay)/2 + 20, color: s.color, int: 0.4, life: 2, ml: 2 });
            if (v.age > s.tetherDur) {
                spawnP(v.ax, v.ay, s.color, 8, 'burst');
                spawnP(v.bx, v.by, s.color, 8, 'burst');
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'absolute_zero': (v) => {
        const s = v.spell;
        // ═══ ABSOLUTE ZERO — Cinematic Flash Freeze ═══
        if (v.state === 0) {
            if (v.age === 1) SoundFX.playSweep(1200, 200, 'sine', 2.5, 0.3);
            state.player.x = v.cx - state.player.w / 2; state.player.y = v.cy - state.player.h / 2; state.player.vx = 0; state.player.vy = 0;
            state.player.castAnim = 280; state.player.castType = 'burst';
            // Snowflake particles drift inward
            if (v.age % 3 === 0) {
                for (let k = 0; k < 4; k++) {
                    const a = Math.random() * Math.PI * 2, d = 300 + Math.random() * 100;
                    state.particles.push({ x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d, vx: -Math.cos(a) * 2, vy: -Math.sin(a) * 2, life: 30, ml: 30, color: k % 2 ? '#aaeeff' : '#fff', size: 1 + Math.random() * 2, grav: 0, type: 'sparkle' });
                }
            }
            // Frost mandala expanding on ground
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: v.age * 4, color: '#88eeff', int: 0.5, life: 2, ml: 2 });
            if (v.age > 80) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            // Dramatic pause — everything slows
            state.player.castAnim = 280; state.player.castType = 'burst'; state.player.vx = 0; state.player.vy = 0;
            state.screenShake = 0;
            // Breath particle
            if (v.age % 5 === 0) state.particles.push({ x: v.cx + state.player.facing * 6, y: v.cy - state.player.h / 2 - 5, vx: state.player.facing * 0.5, vy: -0.3, life: 20, ml: 20, color: '#ccddff', size: 2, grav: -0.01, type: 'smoke' });
            if (v.age > 30) { v.state = 2; v.age = 0; }
        } else if (v.state === 2) {
            // Crystallization wave
            state.player.castAnim = 280; state.player.castType = 'burst';
            if (v.age === 1) {
                SoundFX.playTone(800, 'triangle', 0.8, 0.4); SoundFX.playSweep(400, 2000, 'sine', 0.6, 0.3);
                state.shake(30);
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 500, life: 30, maxLife: 30, color: '#88eeff' });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 500, life: 40, maxLife: 40, color: '#fff' });
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 500, color: '#ffffff', int: 3, life: 8, ml: 8 });
                // Freeze + damage all entities
                for (const e of state.entities) {
                    if (!e.active) continue;
                    hurtEntity(e, s.dmg, v.cx, v.cy);
                    state.frozenEntities.set(e, 360);
                }
            }
            if (v.age > 20) { v.state = 3; v.age = 0; }
        } else if (v.state === 3) {
            // Shattering ice crystals off frozen enemies
            if (v.age === 1) {
                SoundFX.playSweep(2000, 4000, 'square', 0.3, 0.2);
                state.player.inv = false;
                for (const e of state.entities) {
                    if (!e.active) continue;
                    for (let k = 0; k < 15; k++) state.particles.push({ x: e.x + Math.random() * e.w, y: e.y + Math.random() * e.h, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6 - 2, life: 50, ml: 50, color: k % 3 === 0 ? '#ffffff' : k % 3 === 1 ? '#aaeeff' : '#66ccff', size: 2 + Math.random() * 3, grav: .1, type: 'debris', rot: Math.random() * 6, rotV: (Math.random() - .5) * .3 });
                }
            }
            if (v.age > 40) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'frostnova': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (v.age === 1) {
                SoundFX.playSweep(420, 1200, 'sine', 0.6, 0.4);
                SoundFX.playNoise(0.4, 0.25, 800, 'highpass');
                state.shake(8);
            }
            const pr = Math.min(1, v.age / 14);
            const r = s.frostR * pr;
            if (v.age % 2 === 0) {
                for (let k = 0; k < 4; k++) {
                    const a = (k / 4) * Math.PI * 2 + v.age * 0.12;
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r,
                        y: v.cy + Math.sin(a) * r,
                        vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5,
                        life: 22, ml: 22, color: k % 2 ? '#ffffff' : s.c2,
                        size: 1.5 + Math.random() * 1.5, grav: 0.01, type: 'sparkle',
                    });
                }
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: r * 1.4, color: s.core, int: 1.4 * pr, life: 2, ml: 2 });
            if (v.age === 1 || v.age === 8) {
                for (const e of state.entities) {
                    if (!isEnemyEntity(e)) continue;
                    const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                    if (d < s.frostR) {
                        hurtEntity(e, s.dmg, v.cx, v.cy);
                        state.frozenEntities.set(e, s.frostSlow);
                        spawnP(e.x + e.w / 2, e.y + e.h / 2, s.c2, 8, 'sparkle');
                    }
                }
            }
            if (v.age > 22) {
                v.state = 1;
                v.age = 0;
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.frostR * 1.4, life: 18, maxLife: 18, color: s.core });
            }
        } else if (v.state === 1) {
            if (v.age > 18) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    'geyser': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (!v.gy) { v.gy = state.H - 24; for (const p of state.platforms) { if (v.tx > p.x && v.tx < p.x + p.w && p.y < v.gy && p.y >= v.ty) v.gy = p.y; } }
            if (v.age % 2 === 0) { spawnP(v.tx + (Math.random() - .5) * s.geyserW, v.gy - 4, '#fff', 1, 'cloud'); state.particles.push({ x: v.tx + (Math.random() - .5) * s.geyserW * 0.5, y: v.gy - 2, vx: (Math.random() - .5) * 2, vy: -2 - Math.random() * 3, life: 20, ml: 20, color: s.c2, size: 4 + Math.random() * 3, grav: -0.03, type: 'smoke' }); }
            if (v.age % 5 === 0) { for (let k = 0; k < 2; k++) spawnP(v.tx + (Math.random() - .5) * s.geyserW * 1.5, v.gy, '#886644', 1, 'dust'); }
            state.dynamicLights.push({ x: v.tx, y: v.gy, r: v.age * 2, color: s.color, int: v.age / 30, life: 2, ml: 2 });
            state.shake(Math.min(v.age / 10, 2));
            if (v.age > 30) { v.state = 1; v.age = 0; SoundFX.playNoise(0.5, 0.4, 300, 'lowpass'); }
        } else if (v.state === 1) {
            state.shake(8);
            state.dynamicLights.push({ x: v.tx, y: v.gy - s.geyserH * 0.5, r: 150, color: s.color, int: 2.5, life: 3, ml: 3 });
            for (let k = 0; k < 6; k++) state.particles.push({ x: v.tx + (Math.random() - .5) * s.geyserW * 0.6, y: v.gy, vx: (Math.random() - .5) * 4, vy: -Math.random() * 18 - 10, life: 35, ml: 35, color: k % 3 === 0 ? '#fff' : k % 3 === 1 ? s.color : s.c2, size: 3 + Math.random() * 5, grav: .35, type: 'debris', rot: Math.random() * 6, rotV: (Math.random() - .5) * .3 });
            if (v.age % 3 === 0) { const h = Math.min(s.geyserH, v.age * 20); for (let k = 0; k < 3; k++) spawnP(v.tx + (Math.random() - .5) * s.geyserW, v.gy - h + Math.random() * 20, s.c2, 1, 'cloud'); }
            for (const e of state.entities) { if (!e.active) continue; if (Math.abs(e.x + e.w / 2 - v.tx) < s.geyserW / 2 + e.w / 2) { if (v.age % 5 === 0) hurtEntity(e, 4, v.tx, v.gy); e.vy = -16 / (e.mass || 1); e.y -= 4; } }
            if (v.age > 40) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
        }
    },
    'tsunami': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (!v.facing) v.facing = state.player.facing;
            if (v.age === 1) { SoundFX.playSweep(100, 280, 'sine', 1.8, 0.5); v.waves = []; }
            if (v.age % 2 === 0) {
                for (let k = 0; k < 5; k++) {
                    state.particles.push({
                        x: v.cx + (Math.random() - .5) * 60,
                        y: state.H - 20 - Math.random() * (v.age * 2.5),
                        vx: v.facing * Math.random() * 2,
                        vy: -Math.random() * 4 - 1.5,
                        life: 28, ml: 28,
                        color: Math.random() > .3 ? s.color : s.c2,
                        size: 4 + Math.random() * 5, grav: .05, type: 'cloud',
                    });
                }
            }
            state.dynamicLights.push({ x: v.cx, y: state.H - 60, r: 120, color: s.color, int: v.age / 25, life: 2, ml: 2 });
            state.shake(Math.min(v.age / 8, 5));
            if (v.age > 32) {
                v.state = 1; v.age = 0;
                SoundFX.playNoise(1.8, 0.6, 180, 'lowpass');
                const waveCount = s.waveCount || 3;
                for (let i = 0; i < waveCount; i++) {
                    v.waves.push({
                        x: v.cx - v.facing * i * 100,
                        height: 0,
                        maxHeight: 140 - i * 18,
                        speed: 9 - i * 0.8,
                        seed: Math.random() * 100,
                        hitTimer: 0,
                    });
                }
            }
        } else if (v.state === 1) {
            state.shake(7);
            for (const w of v.waves) {
                w.x += v.facing * w.speed;
                if (w.height < w.maxHeight) w.height += 4;
                w.hitTimer++;
                state.dynamicLights.push({
                    x: w.x, y: state.H - w.height * 0.5,
                    r: w.height * 1.5, color: s.c2, int: 1.4, life: 2, ml: 2,
                });
                if (w.hitTimer % 2 === 0) {
                    for (let k = 0; k < 6; k++) {
                        state.particles.push({
                            x: w.x + (Math.random() - .5) * 70,
                            y: state.H - Math.random() * w.height * 1.2,
                            vx: v.facing * (Math.random() * 7 + 3),
                            vy: (Math.random() - .5) * 4 - 1.5,
                            life: 28, ml: 28,
                            color: k % 4 === 0 ? '#ffffff' : Math.random() > .4 ? s.color : s.c2,
                            size: 3 + Math.random() * 5, grav: .12, type: 'trail',
                        });
                    }
                }
                if (w.hitTimer % 4 === 0) {
                    spawnP(w.x + v.facing * 30, state.H - w.height + Math.random() * 20, '#ffffff', 3, 'sparkle');
                }
                if (w.hitTimer % 14 === 0) {
                    state.shockwaves.push({ x: w.x, y: state.H - 30, r: 0, maxR: 80, life: 10, maxLife: 10, color: s.c2 });
                }
                for (const e of state.entities) {
                    if (!isEnemyEntity(e)) continue;
                    if (Math.abs(e.x + e.w / 2 - w.x) < 60 && e.y > state.H - (w.height + 60)) {
                        if (w.hitTimer % 5 === 0) hurtEntity(e, s.dmg * 0.4 | 0, w.x, e.y);
                        e.vx += v.facing * 9 / (e.mass || 1);
                        e.vy -= 4 / (e.mass || 1);
                    }
                }
            }
            v.waves = v.waves.filter(w => w.x > -200 && w.x < state.W + 200);
            if (v.waves.length === 0) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'tidal_prison': (v) => {
        const s = v.spell;
        if (!v.target || !v.target.active) { removeWaterVfx(v); return; }
        const target = v.target;
        const ex = target.x + target.w / 2;
        const ey = target.y + target.h / 2;
        v.tx = ex; v.ty = ey;
        if (v.state === 0) {
            state.frozenEntities.set(target, 6);
            target.vx *= 0.7;
            target.vy *= 0.6;
            target.vy -= 0.18;
            const pressure = Math.min(1, v.age / s.crushAt);
            const r = s.prisonR * (0.45 + pressure * 0.55);
            v.r = r;
            v.pressure = pressure;
            if (v.age % 4 === 0) {
                const drop = {
                    angle: Math.random() * Math.PI * 2,
                    dist: r * (0.9 + Math.random() * 0.15),
                    speed: 0.05 + Math.random() * 0.08,
                    size: 1 + Math.random() * 2,
                    life: 0,
                };
                v.drops.push(drop);
                if (v.drops.length > 26) v.drops.shift();
            }
            for (const drop of v.drops) {
                drop.angle += drop.speed * (1 + pressure * 1.5);
                drop.life++;
            }
            const tickDmg = v.age % 24 === 0 ? s.orbitDmg + Math.floor(pressure * 8) : 0;
            if (tickDmg > 0) {
                hurtEntity(target, tickDmg, ex, ey);
                spawnP(ex + (Math.random() - .5) * r, ey + (Math.random() - .5) * r, s.core, 3, 'sparkle');
                SoundFX.playTone(540 + pressure * 280, 'sine', 0.07, 0.1);
            }
            state.dynamicLights.push({ x: ex, y: ey, r: r * 1.8, color: s.c2, int: 0.65 + pressure * 1.1, life: 2, ml: 2 });
            if (v.age > s.prisonDur) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            if (v.age === 1) {
                hurtEntity(target, s.dmg * 1.4 | 0, ex, ey);
                target.vy -= 10 / (target.mass || 1);
                target.vx += (Math.random() - .5) * 6;
                spawnP(ex, ey, '#ffffff', 32, 'explode');
                spawnP(ex, ey, s.c2, 22, 'burst');
                spawnP(ex, ey, s.core, 16, 'sparkle');
                state.shockwaves.push({ x: ex, y: ey, r: 0, maxR: s.prisonR * 1.6, life: 16, maxLife: 16, color: s.core });
                state.dynamicLights.push({ x: ex, y: ey, r: 140, color: '#ffffff', int: 3, life: 12, ml: 12 });
                SoundFX.playSweep(900, 1700, 'sine', 0.3, 0.15);
                SoundFX.playNoise(0.5, 0.3, 800, 'highpass');
                state.shake(7);
            }
            if (v.age > 14) removeWaterVfx(v);
        }
    },
    'rain': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (!v.cy) v.cy = 30;
            if (v.age % 2 === 0) { spawnP(v.tx + (Math.random() - .5) * s.rainR * 1.5, v.cy + (Math.random() - .5) * 15, s.c2, 1, 'smoke'); state.particles.push({ x: v.tx + (Math.random() - .5) * s.rainR, y: v.cy, vx: (Math.random() - .5), vy: (Math.random() - .5) * 0.5, life: 30, ml: 30, color: s.color, size: 6 + Math.random() * 4, grav: -0.01, type: 'cloud' }); }
            state.dynamicLights.push({ x: v.tx, y: v.cy, r: s.rainR * 1.5, color: s.color, int: v.age / 40, life: 2, ml: 2 });
            if (v.age > 40) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            for (let k = 0; k < 3; k++) { const rx = v.tx + (Math.random() - .5) * s.rainR * 2; state.particles.push({ x: rx, y: v.cy + 10, vx: (Math.random() - .5) * 0.5, vy: Math.random() * 5 + 7, life: 80, ml: 80, color: k === 0 ? '#fff' : s.core, size: 1, grav: 0, type: 'trail' }); }
            if (v.age % 5 === 0) state.particles.push({ x: v.tx + (Math.random() - .5) * s.rainR * 1.5, y: v.cy, vx: 0, vy: 0, life: 25, ml: 25, color: s.c2, size: 8 + Math.random() * 4, grav: -0.005, type: 'cloud' });
            state.dynamicLights.push({ x: v.tx, y: v.cy, r: s.rainR * 2, color: s.color, int: 0.6, life: 2, ml: 2 });
            const pdx = Math.abs((state.player.x + state.player.w / 2) - v.tx);
            if (pdx < s.rainR) { if (v.age % 2 === 0) { state.player.hp = Math.min(state.player.maxHp, state.player.hp + s.healAmt); state.player.mana = Math.min(state.player.maxMana, state.player.mana + s.manaAmt); } if (v.age % 30 === 0) { spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#44ff44', 5, 'sparkle'); state.damageNumbers.push({ x: state.player.x + state.player.w / 2, y: state.player.y - 10, val: Math.floor(s.healAmt * 15), life: 40, vy: -1, color: '#44ff44', sc: 1 }); } if (v.age % 8 === 0) state.dynamicLights.push({ x: state.player.x + state.player.w / 2, y: state.player.y, r: 40, color: '#44ff44', int: 1.5, life: 4, ml: 4 }); }
            for (const e of state.entities) { if (!e.active) continue; if (Math.abs(e.x + e.w / 2 - v.tx) < s.rainR) e.vx *= 0.9; }
            if (v.age > s.rainDur) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
        }
    },
    'whirlpool': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            let gy = state.H - 24; for (const p of state.platforms) { if (v.tx > p.x && v.tx < p.x + p.w && v.ty <= p.y) gy = Math.min(gy, p.y); }
            v.gy = gy; v.state = 1; v.age = 0; SoundFX.playSweep(200, 600, 'sine', 1.0, 0.3);
        } else if (v.state === 1) {
            if (v.age % 2 === 0) { for (let k = 0; k < 3; k++) { const a = v.age * 0.15 + k * Math.PI * 2 / 3, d = s.whorlR * 0.3 + k * s.whorlR * 0.25; state.particles.push({ x: v.tx + Math.cos(a) * d, y: v.gy - 2, vx: Math.cos(a + Math.PI / 2) * d * 0.15, vy: -Math.random() * 0.5, life: 18, ml: 18, color: k === 0 ? '#fff' : s.c2, size: 2 + Math.random() * 3, grav: 0, type: 'trail' }); } }
            state.dynamicLights.push({ x: v.tx, y: v.gy, r: s.whorlR * 1.2 + Math.sin(v.age * 0.1) * 15, color: s.color, int: 1 + Math.sin(v.age * 0.08) * 0.3, life: 2, ml: 2 });
            if (v.age % 8 === 0) spawnP(v.tx + (Math.random() - .5) * s.whorlR, v.gy, s.core, 1, 'sparkle');
            for (const e of state.entities) { if (!e.active) continue; const ex = e.x + e.w / 2, dx = v.tx - ex, dist = Math.abs(dx); if (dist < s.whorlR && Math.abs(e.y + e.h - v.gy) < 30) { const intens = 1 - dist / s.whorlR; e.vx += Math.sign(dx) * s.whorlStr * intens / (e.mass || 1); e.vx *= 0.82; if (v.age % 25 === 0) { hurtEntity(e, s.dmg, v.tx, v.gy); spawnP(ex, e.y, s.c2, 3, 'burst'); } } }
            if (v.age > s.whorlDur) { spawnP(v.tx, v.gy, s.c2, 15, 'burst'); const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
        }
    },
    'riptide': (v) => {
        const s = v.spell;
        const ax = v.tx, ay = v.ty;
        const bx = v.ox, by = v.oy;
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const dirx = dx / len, diry = dy / len;
        const perpx = -diry, perpy = dirx;
        v.pullX = bx; v.pullY = by;

        if (v.state === 0) {
            if (v.age === 1) {
                SoundFX.playSweep(850, 260, 'sine', 0.35, 0.22);
                SoundFX.playNoise(0.18, 0.16, 1500, 'bandpass', 5);
            }
            if (v.age % 2 === 0) {
                const t = Math.random();
                const wave = Math.sin(v.age * 0.12 + t * 6) * 8;
                state.particles.push({
                    x: ax + dx * t + perpx * wave,
                    y: ay + dy * t + perpy * wave * 0.35,
                    vx: dirx * 1.2 - perpx * 0.3,
                    vy: diry * 1.2 - 0.4,
                    life: 20, ml: 20,
                    color: Math.random() > 0.4 ? s.c2 : s.core,
                    size: 2 + Math.random() * 2,
                    grav: -0.01,
                    type: 'trail'
                });
            }
            if (v.age > 12) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            const halfW = s.ripW * 0.24;
            if (v.age % 2 === 0) {
                for (let k = 0; k < 4; k++) {
                    const t = Math.random();
                    const offset = (Math.random() - 0.5) * halfW * 1.6;
                    state.particles.push({
                        x: ax + dx * t + perpx * offset,
                        y: ay + dy * t + perpy * offset * 0.5,
                        vx: dirx * (2 + Math.random() * 2),
                        vy: diry * (1.6 + Math.random()) - 0.35,
                        life: 16 + Math.random() * 8, ml: 20,
                        color: k % 3 === 0 ? s.core : s.color,
                        size: 1.5 + Math.random() * 1.8,
                        grav: -0.01,
                        type: 'trail'
                    });
                }
            }
            for (const e of state.entities) {
                if (!e.active) continue;
                const probe = distToSegment(e.x + e.w / 2, e.y + e.h / 2, ax, ay, bx, by);
                if (probe.dist > halfW) continue;
                const intensity = 1 - probe.dist / halfW;
                const mass = e.mass || 1;
                e.vx += dirx * s.ripF * 0.18 * intensity / mass;
                e.vy += diry * s.ripF * 0.12 * intensity / mass - 0.12;
                e.vx *= 0.96;
                if (v.age % 18 === 0) hurtEntity(e, s.dmg, probe.x, probe.y);
            }
            for (const p of state.projectiles) {
                const probe = distToSegment(p.x, p.y, ax, ay, bx, by);
                if (probe.dist > halfW * 0.88) continue;
                const intensity = 1 - probe.dist / (halfW * 0.88);
                p.vx += dirx * 0.45 * intensity;
                p.vy += diry * 0.26 * intensity - 0.08;
            }
            state.dynamicLights.push({ x: (ax + bx) * 0.5, y: (ay + by) * 0.5, r: s.ripW * 0.8, color: s.c2, int: 0.45, life: 2, ml: 2 });
            if (v.age > s.ripDur) {
                spawnP(bx, by, s.core, 10, 'burst');
                state.shockwaves.push({ x: bx, y: by, r: 0, maxR: 60, life: 10, maxLife: 10, color: s.c2 });
                removeWaterVfx(v);
            }
        }
    },
    'depth_charge': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (v.age === 1) {
                v.gy = findGroundY(v.x, v.ty) - 12;
                SoundFX.playSweep(300, 120, 'sine', 0.25, 0.2);
            }
            v.vy += 0.18;
            v.y += v.vy;
            v.x += Math.sin(v.age * 0.18 + v.wobble) * 0.9;
            if (v.age % 2 === 0) {
                state.particles.push({
                    x: v.x + (Math.random() - 0.5) * 10,
                    y: v.y + 10 + Math.random() * 8,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: Math.random() * 2.4,
                    life: 18, ml: 18,
                    color: Math.random() > 0.35 ? s.color : s.c2,
                    size: 2 + Math.random() * 2,
                    grav: 0.04,
                    type: 'cloud'
                });
            }
            state.dynamicLights.push({ x: v.x, y: v.y, r: 44, color: s.c2, int: 0.55, life: 2, ml: 2 });
            if (v.y >= v.gy || v.age > s.sinkDur) {
                v.y = v.gy;
                v.state = 1;
                v.age = 0;
            }
        } else if (v.state === 1) {
            if (v.age === 1) SoundFX.playSweep(420, 60, 'triangle', 0.4, 0.28);
            const pullR = s.exR * 1.2;
            for (const e of state.entities) {
                if (!e.active) continue;
                const ex = e.x + e.w / 2;
                const ey = e.y + e.h / 2;
                const dx = v.x - ex;
                const dy = v.y - ey;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist >= pullR) continue;
                const pull = (1 - dist / pullR) * 1.2 / (e.mass || 1);
                e.vx += dx / dist * pull;
                e.vy += dy / dist * pull - 0.1;
            }
            for (const p of state.projectiles) {
                const dx = v.x - p.x;
                const dy = v.y - p.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist >= pullR) continue;
                const pull = (1 - dist / pullR) * 0.45;
                p.vx += dx / dist * pull;
                p.vy += dy / dist * pull;
            }
            if (v.age % 2 === 0) spawnP(v.x + (Math.random() - 0.5) * 14, v.y + (Math.random() - 0.5) * 14, s.c2, 1, 'sparkle');
            state.dynamicLights.push({ x: v.x, y: v.y, r: pullR * 0.65, color: s.core, int: 0.4 + v.age * 0.03, life: 2, ml: 2 });
            if (v.age > 18) {
                v.state = 2;
                v.age = 0;
                explode(v.x, v.y, s.exR, s.exF, s.dmg, s.c2, s.core);
                SoundFX.playNoise(0.45, 0.22, 180, 'lowpass');
            }
        } else if (v.state === 2) {
            if (v.age % 2 === 0) spawnP(v.x + (Math.random() - 0.5) * s.exR * 0.7, v.y + (Math.random() - 0.5) * 18, s.core, 1, 'cloud');
            if (v.age > 12) removeWaterVfx(v);
        }
    },
    'hydra': (v) => {
        const s = v.spell;
        if (!v.poolY) v.poolY = findGroundY(v.cx, v.cy) - 4;
        if (v.state === 0) {
            if (v.age === 1) {
                for (let i = 0; i < s.hydraHeads; i++) {
                    v.heads.push({
                        phase: i / s.hydraHeads * Math.PI * 2,
                        tipX: v.cx,
                        tipY: v.poolY,
                        lunge: 0,
                        cooldown: i * 8,
                        target: null,
                        hitThisLunge: false,
                    });
                }
                SoundFX.playSweep(220, 760, 'sine', 0.32, 0.22);
            }
            if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - 0.5) * 26, v.poolY, s.c2, 1, 'cloud');
            if (v.age > 14) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            const claimed = [];
            for (let i = 0; i < v.heads.length; i++) {
                const head = v.heads[i];
                const baseA = v.age * 0.06 + head.phase;
                head.baseX = v.cx + Math.cos(baseA) * 28;
                head.baseY = v.poolY - 10 - Math.sin(baseA * 1.4) * 8;
                if (!head.target?.active || Math.hypot((head.target.x + head.target.w / 2) - v.cx, (head.target.y + head.target.h / 2) - v.poolY) > s.hydraRange * 1.4) {
                    head.target = acquireHydraTarget(v.cx, v.poolY, s.hydraRange, claimed);
                }
                if (head.target) claimed.push(head.target);
                if (head.cooldown > 0) head.cooldown--;
                if (head.target?.active && head.cooldown <= 0 && head.lunge < 0.05) {
                    head.lunge = 1;
                    head.hitThisLunge = false;
                    head.cooldown = 28 + i * 5;
                }
                if (head.lunge > 0.01) head.lunge *= 0.84;
                const tx = head.target?.active ? head.target.x + head.target.w / 2 : head.baseX + Math.cos(baseA) * 30;
                const ty = head.target?.active ? head.target.y + head.target.h / 2 - 6 : head.baseY - 24;
                const reach = 0.18 + head.lunge * 0.9;
                head.tipX += (head.baseX + (tx - head.baseX) * reach - head.tipX) * 0.28;
                head.tipY += (head.baseY + (ty - head.baseY) * reach - head.tipY) * 0.28;
                if (!head.hitThisLunge && head.target?.active && head.lunge > 0.72 && Math.hypot(head.tipX - tx, head.tipY - ty) < 24) {
                    hurtEntity(head.target, s.dmg, head.tipX, head.tipY);
                    head.target.vx += Math.sign(tx - v.cx) * 2.6 / (head.target.mass || 1);
                    head.target.vy -= 2;
                    head.hitThisLunge = true;
                    spawnP(head.tipX, head.tipY, s.core, 5, 'burst');
                    SoundFX.playTone(640 + i * 80, 'triangle', 0.04, 0.05);
                }
            }
            if (v.age % 3 === 0) spawnP(v.cx + (Math.random() - 0.5) * 34, v.poolY + 2, s.color, 1, 'cloud');
            state.dynamicLights.push({ x: v.cx, y: v.poolY - 22, r: s.hydraRange * 0.75, color: s.c2, int: 0.45, life: 2, ml: 2 });
            if (v.age > s.hydraDur) {
                spawnP(v.cx, v.poolY, s.core, 12, 'burst');
                removeWaterVfx(v);
            }
        }
    },
    'mirror_pool': (v) => {
        const s = v.spell;
        if (!v.gy) v.gy = findGroundY(v.tx, v.ty);
        if (v.state === 0) {
            if (v.age === 1) SoundFX.playSweep(380, 820, 'sine', 0.18, 0.16);
            if (v.age % 3 === 0) spawnP(v.tx + (Math.random() - 0.5) * s.mirrorR, v.gy - 4, s.c2, 1, 'sparkle');
            if (v.age > 18) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            const surfaceY = v.gy - 6 + Math.sin(v.age * 0.08) * 2;
            for (const p of state.projectiles) {
                if (p._mirrorEchoed || p._fromMirrorPool || p.age < 4) continue;
                if (Math.abs(p.x - v.tx) > s.mirrorR || p.y < surfaceY - 18 || p.y > surfaceY + 12) continue;
                p._mirrorEchoed = true;
                const clone = cloneProjectile(p, p.x, surfaceY - (p.y - surfaceY), p.vx, -Math.abs(p.vy) - 0.8);
                state.projectiles.push(clone);
                v.mirrored += 1;
                spawnP(p.x, surfaceY, s.core, 4, 'sparkle');
                SoundFX.playTone(920, 'sine', 0.03, 0.05);
            }
            if (Math.abs((state.player.x + state.player.w / 2) - v.tx) < s.mirrorR * 0.65 && Math.abs(state.player.y + state.player.h - v.gy) < 22 && v.age % 10 === 0) {
                state.player.mana = Math.min(state.player.maxMana, state.player.mana + s.mirrorMana);
            }
            if (v.age % 4 === 0) {
                state.particles.push({
                    x: v.tx + (Math.random() - 0.5) * s.mirrorR * 1.5,
                    y: surfaceY + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: -0.25,
                    life: 20, ml: 20,
                    color: Math.random() > 0.5 ? s.core : s.c2,
                    size: 1 + Math.random() * 1.8,
                    grav: -0.01,
                    type: 'sparkle'
                });
            }
            state.dynamicLights.push({ x: v.tx, y: surfaceY, r: s.mirrorR * 1.2, color: s.core, int: 0.35, life: 2, ml: 2 });
            if (v.age > s.mirrorDur) {
                spawnP(v.tx, surfaceY, s.c2, 10, 'burst');
                removeWaterVfx(v);
            }
        }
    },
    'maelstrom': (v) => {
        const s = v.spell;
        const R = s.maelR || 180;

        if (v.state === 0) {
            const eaten = state.enemyProjectiles || [];
            for (let i = eaten.length - 1; i >= 0; i--) {
                const p = eaten[i];
                const dx = v.cx - p.x, dy = v.cy - p.y;
                const d = Math.hypot(dx, dy) || 1;
                if (d < R * 1.2) {
                    const pull = 0.18 * (1 - d / (R * 1.2));
                    p.vx += (dx / d) * pull * 6;
                    p.vy += (dy / d) * pull * 6;
                    if (d < 18) {
                        v.absorbed++;
                        spawnP(p.x, p.y, s.core, 4, 'sparkle');
                        eaten.splice(i, 1);
                    }
                }
            }
            if (v.age % 2 === 0) {
                for (let k = 0; k < 4; k++) {
                    const a = v.age * 0.1 + k * Math.PI * 0.5;
                    const r = R * (0.85 - (v.age / s.pullDur) * 0.4);
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r * 0.55,
                        vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 1.2,
                        life: 22, ml: 22, color: k % 2 ? s.c2 : s.core,
                        size: 1.5 + Math.random() * 1.5, grav: 0, type: 'sparkle',
                    });
                }
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: R * 0.6, color: s.c2, int: 0.8, life: 2, ml: 2 });
            if (v.age > s.pullDur) { v.state = 1; v.age = 0; SoundFX.playSweep(160, 80, 'sine', 1.2, 0.5); }
            return;
        }

        if (v.state === 1) {
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                const dx = v.cx - ex, dy = v.cy - ey;
                const d = Math.hypot(dx, dy) || 1;
                if (d < R) {
                    const pull = 0.22 * (1 - d / R) / (e.mass || 1);
                    e.vx += (dx / d) * pull * 6;
                    e.vy += (dy / d) * pull * 5 - 0.18;
                    if (v.age % 18 === 0) hurtEntity(e, s.dmg, v.cx, v.cy);
                }
            }
            if (v.age % 2 === 0) {
                for (let k = 0; k < 5; k++) {
                    const a = -v.age * 0.18 + k * Math.PI * 0.4;
                    const r = R * (0.9 - Math.sin(v.age * 0.1 + k) * 0.2);
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r * 0.5,
                        vx: -Math.sin(a) * 4, vy: Math.cos(a) * 2,
                        life: 28, ml: 28, color: k % 3 === 0 ? '#ffffff' : k % 2 ? s.c2 : s.color,
                        size: 2 + Math.random() * 2, grav: 0, type: 'sparkle',
                    });
                }
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: R * 0.9, color: s.c2, int: 1.4, life: 2, ml: 2 });
            state.shake(3 + Math.sin(v.age * 0.4) * 1.5);
            if (v.age > s.gatherDur) { v.state = 2; v.age = 0; SoundFX.playSweep(80, 480, 'sine', 1.8, 0.5); }
            return;
        }

        if (v.state === 2) {
            if (v.age === 1) {
                SoundFX.playNoise(1.0, 0.6, 200, 'lowpass');
                state.shake(20);
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: R * 1.5, life: 28, maxLife: 28, color: s.core });
                spawnP(v.cx, v.cy, s.core, 60, 'explode');
                spawnP(v.cx, v.cy, '#ffffff', 30, 'burst');
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: R * 2, color: '#ffffff', int: 4, life: 18, ml: 18 });
                v.columnH = 0;
            }
            v.columnH = Math.min(280, (v.columnH || 0) + 16);
            for (let k = 0; k < 8; k++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * R * 0.5;
                state.particles.push({
                    x: v.cx + Math.cos(a) * r, y: v.cy - Math.random() * v.columnH,
                    vx: Math.cos(a) * 2, vy: -3 - Math.random() * 6,
                    life: 60, ml: 60, color: k % 3 === 0 ? '#ffffff' : k % 2 ? s.c2 : s.color,
                    size: 3 + Math.random() * 4, grav: 0.12,
                    rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.2, type: 'dust',
                });
            }
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const dx = e.x + e.w / 2 - v.cx;
                if (Math.abs(dx) < R * 0.6 && (e.y + e.h / 2) > v.cy - v.columnH) {
                    e.vy -= 14 / (e.mass || 1);
                    e.vx += (Math.random() - .5) * 3;
                    if (v.age % 8 === 0) hurtEntity(e, s.dmg * 1.5 | 0, v.cx, v.cy);
                }
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy - v.columnH * 0.5, r: R * 0.9, color: s.core, int: 2.2, life: 2, ml: 2 });
            if (v.age > s.columnDur) removeWaterVfx(v);
        }
    },

    'aquatic_surge': (v) => {
        const s = v.spell;
        const player = state.player;
        const dur = v.dur || s.surgeDur || 28;
        const range = v.range || s.surgeRange || 240;
        const hold = v.hold || s.surfHold || 16;
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;

        if (v.state === 0) {
            player.castAnim = 220;
            player.castType = 'channel';
            player.vx *= 0.82;
            player.vy *= 0.76;
            player.y -= Math.sin(v.age * 0.18) * 0.18;
            if (v.age % 2 === 0) {
                v.spray.push({ x: cx - v.dx * 12, y: cy + 14, life: 18 });
                spawnP(cx - v.dx * 14, cy + 14, s.c2, 2, 'sparkle');
            }
            state.dynamicLights.push({ x: cx, y: cy + 12, r: 66, color: s.core, int: 1.3, life: 2, ml: 2 });
            if (v.age >= hold) {
                v.state = 1;
                v.age = 0;
                v.startX = cx;
                v.startY = cy;
                player.inv = true;
                SoundFX.playSweep(520, 980, 'sine', 0.42, 0.2);
            }
            return;
        }

        const stepX = v.dx * (range / dur);
        const stepY = v.dy * (range / dur);
        // Manually move player — updatePlayer() early-returns while inv is true,
        // so velocity alone never advances position. Drive position directly.
        player.x = Math.max(10, Math.min(state.W - player.w - 10, player.x + stepX));
        player.y = Math.max(18, Math.min(state.H - player.h - 24, player.y + stepY * 0.62 - 0.35));
        player.vx = stepX * 0.9;
        player.vy = stepY * 0.72 - 0.35;
        player.onGround = false;
        v.trail.push({ x: cx, y: cy, life: 18 });
        if (v.trail.length > 14) v.trail.shift();
        for (const t of v.trail) t.life--;

        for (const e of state.entities) {
            if (!isEnemyEntity(e) || v.hitList.has(e)) continue;
            const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
            if (Math.hypot(cx - ex, cy - ey) < 34) {
                e.vx += v.dx * 8 / (e.mass || 1);
                e.vy += v.dy * 4 / (e.mass || 1) - 1.4;
                v.hitList.add(e);
                spawnP(ex, ey, s.core, 8, 'burst');
                spawnP(ex, ey, s.c2, 5, 'sparkle');
                SoundFX.playTone(700, 'sine', 0.04, 0.08);
            }
        }

        if (v.age % 2 === 0) {
            for (let k = 0; k < 4; k++) {
                const px = cx - v.dx * k * 9;
                const py = cy - v.dy * k * 6 + 12;
                state.particles.push({
                    x: px + (Math.random() - .5) * 9, y: py + (Math.random() - .5) * 7,
                    vx: -v.dx * 2.4 + (Math.random() - .5) * 1.7,
                    vy: -v.dy * 1.4 + (Math.random() - .5) * 1.5 - 0.6,
                    life: 24, ml: 24, color: k % 2 ? s.c2 : s.core,
                    size: 2 + Math.random() * 2.5, grav: 0.02, type: 'sparkle',
                });
            }
        }
        state.dynamicLights.push({ x: cx, y: cy, r: 74, color: s.core, int: 1.6, life: 2, ml: 2 });
        if (v.age >= dur) {
            player.inv = false;
            spawnP(cx, cy, s.c2, 18, 'burst');
            state.shockwaves.push({ x: cx, y: cy, r: 0, maxR: 50, life: 12, maxLife: 12, color: s.core });
            removeWaterVfx(v);
        }
    },

    steam_vent(v) {
        const s = v.spell;
        if (v.age % 4 === 0) {
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2 * 0.3 - Math.PI * 0.15;
                spawnP(v.cx + Math.cos(angle) * 10, v.cy - 20, '#99bbcc', 3, 'burst');
                spawnP(v.cx + Math.cos(angle) * 10, v.cy - 20, '#ffffff', 2, 'cloud');
            }
        }
        if (v.age % 8 === 0) {
            for (const e of state.entities) {
                if (!e.active) continue;
                const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                if (d < s.steamR) {
                    e.vy -= 3;
                    hurtEntity(e, 3, v.cx, v.cy);
                }
            }
        }
        if (v.age >= s.steamDur) removeWaterVfx(v);
    },

    permafrost(v) {
        const s = v.spell;
        if (v.age % 6 === 0) {
            for (const e of state.entities) {
                if (!e.active) continue;
                if (e.y + e.h >= v.ty - 20 && e.y + e.h <= v.ty + 20 && Math.abs(e.x + e.w / 2 - v.tx) < s.frostW / 2) {
                    e.vx *= 0.7;
                    hurtEntity(e, 2, v.tx, v.ty);
                    spawnP(e.x + e.w / 2, e.y + e.h, '#aaddff', 2, 'sparkle');
                }
            }
            spawnP(v.tx + (Math.random() - 0.5) * s.frostW, v.ty, '#ddeeff', 2, 'sparkle');
        }
        if (v.age >= s.frostDur) removeWaterVfx(v);
    }
};
export const VFX_DRAW = {
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    'tidal_link'(v, X) {
        const s = v.spell;
        if (v.state === 0) {
            // Pulsing anchor point
            const pulse = 1 + Math.sin(v.age * 0.15) * 0.3;
            const grad = X.createRadialGradient(v.ax, v.ay, 0, v.ax, v.ay, 12 * pulse);
            grad.addColorStop(0, s.core);
            grad.addColorStop(0.5, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.8;
            X.beginPath(); X.arc(v.ax, v.ay, 12 * pulse, 0, Math.PI * 2); X.fill();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Water beam between two points
            const fade = v.age > v.spell.tetherDur - 30 ? Math.max(0, (v.spell.tetherDur - v.age) / 30) : 1;
            X.globalAlpha = 0.6 * fade;
            // Wavy line
            X.strokeStyle = s.color;
            X.lineWidth = 6;
            X.beginPath();
            X.moveTo(v.ax, v.ay);
            const dx = v.bx - v.ax, dy = v.by - v.ay;
            const len = Math.hypot(dx, dy) || 1;
            const steps = Math.max(5, Math.floor(len / 15));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const perpX = -dy / len, perpY = dx / len;
                const wave = Math.sin(t * Math.PI * 4 + v.age * 0.15) * 5;
                X.lineTo(v.ax + dx * t + perpX * wave, v.ay + dy * t + perpY * wave);
            }
            X.stroke();
            // Inner bright core
            X.strokeStyle = s.core;
            X.lineWidth = 2;
            X.globalAlpha = 0.4 * fade;
            X.beginPath();
            X.moveTo(v.ax, v.ay);
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const perpX = -dy / len, perpY = dx / len;
                const wave = Math.sin(t * Math.PI * 4 + v.age * 0.15) * 5;
                X.lineTo(v.ax + dx * t + perpX * wave, v.ay + dy * t + perpY * wave);
            }
            X.stroke();
            // Endpoint glows
            for (const pt of [{x:v.ax,y:v.ay},{x:v.bx,y:v.by}]) {
                const g = X.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 10);
                g.addColorStop(0, s.core);
                g.addColorStop(1, 'transparent');
                X.fillStyle = g;
                X.globalAlpha = 0.7 * fade;
                X.beginPath(); X.arc(pt.x, pt.y, 10, 0, Math.PI * 2); X.fill();
            }
            X.globalAlpha = 1;
        }
    },
    steam_vent(v, X) {
        const s = v.spell;
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const age = (v.age + i * (s.steamDur / numParticles)) % s.steamDur;
            const rise = (age / s.steamDur) * 100;
            const scale = 1 - (age / s.steamDur);
            const x = v.cx + (Math.sin(i * Math.PI * 2 / numParticles + v.age * 0.03) * 20);
            const y = v.cy - rise;
            const rad = 25 * scale;
            X.fillStyle = '#ffffff';
            X.globalAlpha = 0.3 * scale;
            X.beginPath();
            X.arc(x, y, rad, 0, Math.PI * 2);
            X.fill();
        }
        X.globalAlpha = 1;
    },
    permafrost(v, X) {
        const s = v.spell;
        const alpha = 1 - (v.age / s.frostDur);
        X.fillStyle = '#aaddff';
        X.globalAlpha = 0.3 * alpha;
        X.fillRect(v.tx - s.frostW / 2, v.ty - 10, s.frostW, 20);
        X.strokeStyle = '#88ccff';
        X.lineWidth = 2;
        X.globalAlpha = 0.5 * alpha;
        X.strokeRect(v.tx - s.frostW / 2, v.ty - 10, s.frostW, 20);
        // Ice crystals
        for (let i = 0; i < 5; i++) {
            const cx = v.tx - s.frostW / 2 + (i / 4) * s.frostW;
            X.globalAlpha = 0.4 * alpha;
            X.fillStyle = '#ddeeff';
            X.beginPath();
            X.moveTo(cx, v.ty - 8);
            X.lineTo(cx - 3, v.ty - 2);
            X.lineTo(cx, v.ty + 8);
            X.lineTo(cx + 3, v.ty - 2);
            X.closePath();
            X.fill();
        }
        X.globalAlpha = 1;
    },
    'absolute_zero': (v, X) => {
        const s = v.spell;
        // ═══ DRAW ABSOLUTE ZERO ═══
        if (v.state === 0) {
            X.globalAlpha = v.age / 200; X.fillStyle = '#88ccff'; X.fillRect(0, 0, W, H); X.globalAlpha = 1;
            X.save(); X.translate(v.cx, v.cy);
            const r = v.age * 3.5;
            X.strokeStyle = s.color; X.lineWidth = 2; X.globalAlpha = 0.5;
            X.beginPath(); X.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); X.stroke();
            for (let k = 0; k < 12; k++) {
                const a = k / 12 * Math.PI * 2 + v.age * 0.005;
                X.globalAlpha = 0.3 + Math.sin(v.age * 0.05 + k) * 0.2;
                X.beginPath(); X.moveTo(0, 0); X.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); X.stroke();
                if (r > 40) {
                    const br = r * 0.6, ba = a + 0.3;
                    X.beginPath(); X.moveTo(Math.cos(a) * br * 0.5, Math.sin(a) * br * 0.3); X.lineTo(Math.cos(ba) * br, Math.sin(ba) * br * 0.6); X.stroke();
                    const ba2 = a - 0.3;
                    X.beginPath(); X.moveTo(Math.cos(a) * br * 0.5, Math.sin(a) * br * 0.3); X.lineTo(Math.cos(ba2) * br, Math.sin(ba2) * br * 0.6); X.stroke();
                }
            }
            X.restore(); X.globalAlpha = 1;
        } else if (v.state === 1) {
            X.globalAlpha = 0.4; X.fillStyle = '#aaddff'; X.fillRect(0, 0, W, H); X.globalAlpha = 1;
        } else if (v.state === 2) {
            X.globalAlpha = Math.max(0, 1 - v.age / 15); X.fillStyle = '#ffffff'; X.fillRect(0, 0, W, H); X.globalAlpha = 1;
        } else if (v.state === 3) {
            X.globalAlpha = Math.max(0, 0.3 - v.age / 100); X.fillStyle = '#aaeeff'; X.fillRect(0, 0, W, H); X.globalAlpha = 1;
        }
    },
    'frostnova': (v, X) => {
        const s = v.spell;
        const T = performance.now() * 0.003;
        if (v.state === 0) {
            const pr = Math.min(1, v.age / 14);
            const r = s.frostR * pr;
            addLightGlow(X, v.cx, v.cy, r * 1.2, '#ffffff', s.c2, 0.55 * pr);
            X.save();
            const dome = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r);
            dome.addColorStop(0, 'rgba(180,240,255,0.45)');
            dome.addColorStop(0.5, 'rgba(102,221,255,0.35)');
            dome.addColorStop(1, 'transparent');
            X.fillStyle = dome;
            X.globalAlpha = 0.7;
            X.beginPath(); X.arc(v.cx, v.cy, r, 0, Math.PI * 2); X.fill();
            X.restore();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + T * 0.2;
                const dist = r * (0.45 + (i % 2) * 0.35);
                const cx = v.cx + Math.cos(a) * dist;
                const cy = v.cy + Math.sin(a) * dist;
                drawIceCrystal(X, cx, cy, 5 + (i % 3), a + T, s.c2, '#5a8aa8', 0.85 * pr);
                addLightGlow(X, cx, cy, 10, '#ffffff', s.c2, 0.4);
            }
            drawCausticRing(X, v.cx, v.cy, r * 1.05, '#ffffff', 0.7, 1);
            drawCausticRing(X, v.cx, v.cy, r * 0.7, s.c2, 0.55, 1);
        } else if (v.state === 1) {
            const fade = Math.max(0, 1 - v.age / 18);
            addLightGlow(X, v.cx, v.cy, s.frostR * 1.4 * (0.6 + (1 - fade) * 0.5), '#ffffff', s.c2, fade * 0.5);
        }
    },
    'geyser': (v, X) => {
        if (v.state === 0) {
            addLightGlow(X, v.tx, v.gy - 4, v.spell.geyserW * 1.4, v.spell.core, v.spell.c2, 0.5 * Math.min(1, v.age / 20));
            X.globalAlpha = Math.min(0.8, v.age / 20); X.fillStyle = v.spell.c2;
            X.beginPath(); X.ellipse(v.tx, v.gy, v.spell.geyserW * 0.8, 6, 0, 0, Math.PI * 2); X.fill();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            const h = Math.min(v.spell.geyserH, v.age * 25);
            const w = v.spell.geyserW * (1 - (v.age / 50) * 0.5);
            X.globalAlpha = Math.max(0, 1 - v.age / 40);
            const grad = X.createLinearGradient(0, v.gy, 0, v.gy - h);
            grad.addColorStop(0, v.spell.color); grad.addColorStop(0.8, v.spell.c2); grad.addColorStop(1, 'transparent');
            X.fillStyle = grad; X.fillRect(v.tx - w / 2, v.gy - h, w, h);
            // Core jet
            X.fillStyle = '#fff'; X.globalAlpha = Math.max(0, 0.6 - v.age / 30);
            X.fillRect(v.tx - w / 4, v.gy - h, w / 2, h);
            X.globalAlpha = 1;
        }
    },
    'tsunami': (v, X) => {
        const s = v.spell;
        const T = performance.now() * 0.004;
        if (v.state === 0) {
            const pr = Math.min(1, v.age / 32);
            const baseY = state.H - 22;
            X.save();
            const charge = X.createLinearGradient(v.cx, baseY, v.cx, baseY - 140 * pr);
            charge.addColorStop(0, 'rgba(10,40,90,0.85)');
            charge.addColorStop(0.5, s.color);
            charge.addColorStop(1, 'rgba(170,238,255,0.8)');
            X.fillStyle = charge;
            X.globalAlpha = 0.85 * pr;
            X.beginPath();
            X.moveTo(v.cx - 35 * pr, baseY);
            X.bezierCurveTo(v.cx - 50 * pr, baseY - 60 * pr, v.cx - 20 * pr, baseY - 100 * pr, v.cx, baseY - 130 * pr);
            X.bezierCurveTo(v.cx + 20 * pr, baseY - 100 * pr, v.cx + 50 * pr, baseY - 60 * pr, v.cx + 35 * pr, baseY);
            X.closePath(); X.fill();
            X.restore();
            addLightGlow(X, v.cx, baseY - 70 * pr, 90 * pr, s.core, s.c2, 0.55 * pr);
            X.globalAlpha = 1;
            return;
        }
        if (v.state === 1) {
            const baseY = state.H - 22;
            for (let wi = 0; wi < v.waves.length; wi++) {
                const w = v.waves[wi];
                if (w.height < 4) continue;
                X.save();
                const wbg = X.createLinearGradient(0, baseY, 0, baseY - w.height);
                wbg.addColorStop(0, 'rgba(10,38,90,0.9)');
                wbg.addColorStop(0.35, s.color);
                wbg.addColorStop(0.7, s.c2);
                wbg.addColorStop(0.95, '#ffffff');
                wbg.addColorStop(1, 'rgba(255,255,255,0)');
                X.fillStyle = wbg;
                X.globalAlpha = 0.92 - wi * 0.1;
                X.beginPath();
                X.moveTo(w.x - v.facing * 90, baseY);
                X.bezierCurveTo(
                    w.x - v.facing * 60, baseY - w.height * 0.25,
                    w.x - v.facing * 40, baseY - w.height * 0.65,
                    w.x - v.facing * 8, baseY - w.height * 0.92
                );
                X.bezierCurveTo(
                    w.x + v.facing * 10, baseY - w.height * 1.0,
                    w.x + v.facing * 36, baseY - w.height * 0.6,
                    w.x + v.facing * 70, baseY
                );
                X.closePath(); X.fill();
                X.restore();
                X.save();
                X.globalCompositeOperation = 'lighter';
                X.strokeStyle = '#ffffff';
                X.lineWidth = 3;
                X.globalAlpha = 0.85;
                X.beginPath();
                const crestX = w.x - v.facing * 8;
                const crestY = baseY - w.height * 0.92;
                X.moveTo(crestX - v.facing * 30, crestY + 15);
                X.bezierCurveTo(
                    crestX - v.facing * 10, crestY - 4,
                    crestX + v.facing * 10, crestY - 6,
                    crestX + v.facing * 26, crestY + 8
                );
                X.stroke();
                X.restore();
                X.save();
                X.globalCompositeOperation = 'lighter';
                for (let fi = 0; fi < 5; fi++) {
                    const fx = w.x + v.facing * (-40 + fi * 22 + Math.sin(T + fi + w.seed) * 6);
                    const fy = baseY - w.height * (0.4 + (fi % 2) * 0.3) + Math.sin(T * 2 + fi) * 6;
                    const fg = X.createRadialGradient(fx, fy, 0, fx, fy, 14);
                    fg.addColorStop(0, '#ffffff');
                    fg.addColorStop(0.5, s.core);
                    fg.addColorStop(1, 'transparent');
                    X.fillStyle = fg;
                    X.globalAlpha = 0.6;
                    X.beginPath(); X.arc(fx, fy, 14, 0, Math.PI * 2); X.fill();
                }
                X.restore();
                X.save();
                X.strokeStyle = s.c2;
                X.lineWidth = 1.2;
                X.globalAlpha = 0.5;
                X.beginPath();
                X.moveTo(w.x - v.facing * 80, baseY - w.height * 0.4);
                X.quadraticCurveTo(w.x - v.facing * 30, baseY - w.height * 0.55, w.x, baseY - w.height * 0.7);
                X.stroke();
                X.beginPath();
                X.moveTo(w.x - v.facing * 60, baseY - w.height * 0.2);
                X.quadraticCurveTo(w.x - v.facing * 20, baseY - w.height * 0.32, w.x + v.facing * 10, baseY - w.height * 0.4);
                X.stroke();
                X.restore();
            }
            X.globalAlpha = 1;
        }
    },
    'tidal_prison': (v, X) => {
        if (!v.target || !v.target.active) return;
        const s = v.spell;
        const cx = v.tx, cy = v.ty;
        const r = v.r || s.prisonR;
        const pressure = v.pressure || 0;
        const T = performance.now() * 0.003;
        if (v.state === 0) {
            addLightGlow(X, cx, cy, r * 1.6, s.core, s.c2, 0.45 + pressure * 0.3);
            X.save();
            const dome = X.createRadialGradient(cx - r * 0.25, cy - r * 0.35, 0, cx, cy, r);
            dome.addColorStop(0, 'rgba(180,235,255,0.6)');
            dome.addColorStop(0.55, 'rgba(95,180,235,0.45)');
            dome.addColorStop(0.85, 'rgba(40,90,160,0.35)');
            dome.addColorStop(1, 'transparent');
            X.fillStyle = dome;
            X.globalAlpha = 0.85;
            X.beginPath(); X.arc(cx, cy, r, 0, Math.PI * 2); X.fill();
            X.restore();
            for (let ring = 0; ring < 3; ring++) {
                drawCausticRing(X, cx, cy, r * (0.72 + ring * 0.12), ring === 1 ? s.core : s.c2, 0.45 - ring * 0.1, 0.95);
            }
            X.save();
            X.globalCompositeOperation = 'lighter';
            for (const drop of v.drops || []) {
                const dx = cx + Math.cos(drop.angle) * drop.dist;
                const dy = cy + Math.sin(drop.angle) * drop.dist * 0.78;
                const dropG = X.createRadialGradient(dx, dy, 0, dx, dy, drop.size * 4);
                dropG.addColorStop(0, '#ffffff');
                dropG.addColorStop(0.4, s.c2);
                dropG.addColorStop(1, 'transparent');
                X.fillStyle = dropG;
                X.globalAlpha = 0.85;
                X.beginPath(); X.arc(dx, dy, drop.size * 4, 0, Math.PI * 2); X.fill();
                X.fillStyle = '#ffffff';
                X.globalAlpha = 0.95;
                X.beginPath(); X.ellipse(dx, dy, drop.size * 1.2, drop.size * 1.6, drop.angle, 0, Math.PI * 2); X.fill();
            }
            X.restore();
            X.save();
            X.strokeStyle = '#ffffff';
            X.lineWidth = 1.4;
            X.globalAlpha = 0.75;
            X.beginPath();
            X.ellipse(cx, cy, r, r * 0.9, 0, 0, Math.PI * 2);
            X.stroke();
            X.restore();
            const hot = 0.45 + Math.sin(T * 5) * 0.18 + pressure * 0.4;
            addLightGlow(X, cx - r * 0.25, cy - r * 0.3, r * 0.32, '#ffffff', s.c2, hot);
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            const flash = Math.max(0, 1 - v.age / 14);
            addLightGlow(X, cx, cy, r * 3 * (0.5 + (1 - flash) * 0.6), '#ffffff', s.c2, flash * 0.85);
        }
    },

    'maelstrom': (v, X) => {
        const s = v.spell;
        const R = s.maelR || 180;
        const T = performance.now() * 0.005;
        const cx = v.cx, cy = v.cy;
        X.save();
        if (v.state === 0 || v.state === 1) {
            const intensity = v.state === 0 ? Math.min(1, v.age / s.pullDur) : 1;
            const dome = X.createRadialGradient(cx, cy, 0, cx, cy, R);
            dome.addColorStop(0, 'rgba(140,210,255,0.5)');
            dome.addColorStop(0.5, 'rgba(58,142,221,0.4)');
            dome.addColorStop(0.85, 'rgba(10,58,122,0.4)');
            dome.addColorStop(1, 'transparent');
            X.fillStyle = dome;
            X.globalAlpha = 0.85;
            X.beginPath(); X.ellipse(cx, cy, R, R * 0.55, 0, 0, Math.PI * 2); X.fill();
            X.globalAlpha = 1;
            X.save();
            X.globalCompositeOperation = 'lighter';
            for (let band = 0; band < 5; band++) {
                X.strokeStyle = band % 2 === 0 ? s.core : s.c2;
                X.lineWidth = 1.6 - band * 0.18;
                X.globalAlpha = (0.65 - band * 0.08) * intensity;
                X.beginPath();
                for (let a = 0; a < Math.PI * 2.4; a += 0.08) {
                    const spiralR = R * (0.18 + a / (Math.PI * 2) * 0.7 - band * 0.04);
                    const phase = a + T * (1 + band * 0.4) * (v.state === 0 ? -1 : 1);
                    const px = cx + Math.cos(phase) * spiralR;
                    const py = cy + Math.sin(phase) * spiralR * 0.55;
                    if (a === 0) X.moveTo(px, py); else X.lineTo(px, py);
                }
                X.stroke();
            }
            X.restore();
            addLightGlow(X, cx, cy, R * 0.55 * intensity, '#ffffff', s.core, 0.65 * intensity);
        }
        if (v.state === 2) {
            const H = v.columnH || 0;
            const colG = X.createLinearGradient(0, cy, 0, cy - H);
            colG.addColorStop(0, 'rgba(10,58,122,0.6)');
            colG.addColorStop(0.4, 'rgba(58,142,221,0.55)');
            colG.addColorStop(0.85, 'rgba(170,238,255,0.65)');
            colG.addColorStop(1, '#ffffff');
            X.fillStyle = colG;
            X.globalAlpha = 0.85;
            const baseW = R * 0.55;
            X.beginPath();
            X.moveTo(cx - baseW, cy + 8);
            for (let yi = 0; yi <= 12; yi++) {
                const t = yi / 12;
                const y = cy - H * t;
                const wob = Math.sin(t * 7 + T * 6) * 8;
                X.lineTo(cx - baseW * (1 - t * 0.35) + wob, y);
            }
            for (let yi = 12; yi >= 0; yi--) {
                const t = yi / 12;
                const y = cy - H * t;
                const wob = Math.sin(t * 7 + T * 6 + 1.4) * 8;
                X.lineTo(cx + baseW * (1 - t * 0.35) + wob, y);
            }
            X.closePath(); X.fill();
            X.save();
            X.globalCompositeOperation = 'lighter';
            const coreG = X.createLinearGradient(0, cy, 0, cy - H * 0.9);
            coreG.addColorStop(0, 'rgba(255,255,255,0.0)');
            coreG.addColorStop(0.5, 'rgba(255,255,255,0.6)');
            coreG.addColorStop(1, '#ffffff');
            X.fillStyle = coreG;
            X.globalAlpha = 0.7;
            X.beginPath();
            X.ellipse(cx, cy - H * 0.5, baseW * 0.45, H * 0.55, 0, 0, Math.PI * 2);
            X.fill();
            X.restore();
            addLightGlow(X, cx, cy - H * 0.5, R * 0.8, '#ffffff', s.c2, 0.7);
            addLightGlow(X, cx, cy + 6, R * 0.9, s.core, s.c2, 0.55);
        }
        X.restore();
        X.globalAlpha = 1;
    },

    'aquatic_surge': (v, X) => {
        const s = v.spell;
        const T = performance.now() * 0.005;
        X.save();
        X.globalCompositeOperation = 'lighter';
        for (let ti = 0; ti < v.trail.length; ti++) {
            const t = v.trail[ti];
            const a = t.life / 18;
            if (a <= 0) continue;
            const g = X.createRadialGradient(t.x, t.y, 0, t.x, t.y, 26);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.4, s.core);
            g.addColorStop(1, 'transparent');
            X.fillStyle = g;
            X.globalAlpha = 0.55 * a;
            X.beginPath();
            X.ellipse(t.x, t.y, 22 - ti * 0.4, 10 - ti * 0.25, v.angle, 0, Math.PI * 2);
            X.fill();
        }
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        X.save();
        X.translate(px, py);
        X.rotate(v.angle);
        const wave = X.createLinearGradient(-30, 0, 30, 0);
        wave.addColorStop(0, 'transparent');
        wave.addColorStop(0.3, s.c2);
        wave.addColorStop(0.6, s.core);
        wave.addColorStop(0.85, '#ffffff');
        wave.addColorStop(1, 'transparent');
        X.fillStyle = wave;
        X.globalAlpha = 0.85;
        X.beginPath();
        X.moveTo(-26, -10);
        X.quadraticCurveTo(-8, -18, 28, 0);
        X.quadraticCurveTo(-8, 18, -26, 10);
        X.closePath(); X.fill();
        X.strokeStyle = '#ffffff';
        X.lineWidth = 1.5;
        X.globalAlpha = 0.6;
        X.setLineDash([8, 6]);
        X.beginPath();
        X.moveTo(-22, -4); X.quadraticCurveTo(0, -12, 24, -1);
        X.stroke();
        X.beginPath();
        X.moveTo(-20, 5); X.quadraticCurveTo(0, 12, 22, 1);
        X.stroke();
        X.setLineDash([]);
        X.restore();
        X.restore();
        X.globalAlpha = 1;
    },
    'rain': (v, X) => {
        if (v.state === 0 || v.state === 1) {
            const a = v.state === 0 ? Math.min(0.8, v.age / 40) : Math.max(0, 1 - (v.age / v.spell.rainDur));
            X.globalAlpha = a * 0.7;
            const grad = X.createLinearGradient(0, v.cy - 20, 0, v.cy + 20);
            grad.addColorStop(0, v.spell.color); grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.beginPath(); X.ellipse(v.tx, v.cy, v.spell.rainR * 1.5, 20, 0, 0, Math.PI * 2); X.fill();
            X.globalAlpha = 1;
        }
    },
    'whirlpool': (v, X) => {
        if (v.state !== 1) return;
        const s = v.spell;
        const fade = Math.max(0, Math.min(1, 1 - v.age / s.whorlDur));
        const R = s.whorlR;
        const T = performance.now() * 0.005;
        addLightGlow(X, v.tx, v.gy, R * 0.9, s.c2, s.color, 0.45 * fade);
        X.save();
        X.translate(v.tx, v.gy);
        X.scale(1, 0.28);
        const dome = X.createRadialGradient(0, 0, 0, 0, 0, R);
        dome.addColorStop(0, 'rgba(120,200,255,0.55)');
        dome.addColorStop(0.5, 'rgba(40,90,170,0.5)');
        dome.addColorStop(0.85, 'rgba(8,30,80,0.4)');
        dome.addColorStop(1, 'transparent');
        X.fillStyle = dome;
        X.globalAlpha = 0.8 * fade;
        X.beginPath(); X.arc(0, 0, R, 0, Math.PI * 2); X.fill();
        X.restore();
        X.save();
        X.globalCompositeOperation = 'lighter';
        X.translate(v.tx, v.gy);
        X.scale(1, 0.28);
        for (let band = 0; band < 4; band++) {
            X.strokeStyle = band % 2 === 0 ? '#ffffff' : s.c2;
            X.lineWidth = 1.8 - band * 0.3;
            X.globalAlpha = (0.7 - band * 0.12) * fade;
            X.beginPath();
            for (let a = 0; a < Math.PI * 5; a += 0.12) {
                const sr = (a / (Math.PI * 5)) * R * 0.95 - band * 4;
                if (sr < 4) continue;
                const phase = a + T * (1 + band * 0.25) + band * 0.7;
                const px = Math.cos(phase) * sr;
                const py = Math.sin(phase) * sr;
                if (a === 0) X.moveTo(px, py); else X.lineTo(px, py);
            }
            X.stroke();
        }
        X.restore();
        addLightGlow(X, v.tx, v.gy, 18, '#ffffff', s.c2, 0.7 * fade);
        X.globalAlpha = 1;
    },
    'riptide': (v, X) => {
        const s = v.spell;
        const ax = v.tx, ay = v.ty, bx = v.ox, by = v.oy;
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const perpx = -dy / len, perpy = dx / len;
        const progress = v.state === 0 ? Math.min(1, v.age / 12) : Math.max(0, 1 - v.age / (s.ripDur + 8) * 0.15);
        const width = s.ripW * 0.22 * progress;

        addLightGlow(X, ax, ay, 26 + width, s.core, s.c2, 0.45 * progress);
        addLightGlow(X, bx, by, 28 + width, s.core, s.c2, 0.55 * progress);
        X.save();
        X.globalCompositeOperation = 'lighter';
        const haloGrad = X.createLinearGradient(ax, ay, bx, by);
        haloGrad.addColorStop(0, s.color);
        haloGrad.addColorStop(0.5, s.c2);
        haloGrad.addColorStop(1, s.core);
        X.strokeStyle = haloGrad;
        X.lineWidth = width * 1.8;
        X.lineCap = 'round';
        X.globalAlpha = 0.35;
        X.beginPath();
        X.moveTo(ax, ay);
        X.quadraticCurveTo((ax + bx) * 0.5 + perpx * 24, (ay + by) * 0.5 + perpy * 10, bx, by);
        X.stroke();
        X.restore();
        X.save();
        X.globalAlpha = 0.22 + progress * 0.18;
        const grad = X.createLinearGradient(ax, ay, bx, by);
        grad.addColorStop(0, s.color);
        grad.addColorStop(0.5, s.c2);
        grad.addColorStop(1, s.core);
        X.strokeStyle = grad;
        X.lineWidth = width;
        X.lineCap = 'round';
        X.beginPath();
        X.moveTo(ax, ay);
        X.quadraticCurveTo((ax + bx) * 0.5 + perpx * 24, (ay + by) * 0.5 + perpy * 10, bx, by);
        X.stroke();

        X.globalAlpha = 0.35;
        X.lineWidth = 2;
        X.setLineDash([10, 12]);
        X.strokeStyle = s.core;
        for (let i = -2; i <= 2; i++) {
            X.beginPath();
            X.moveTo(ax + perpx * i * 9, ay + perpy * i * 4);
            X.quadraticCurveTo((ax + bx) * 0.5 + perpx * (18 + i * 8), (ay + by) * 0.5 + perpy * (8 + i * 3), bx + perpx * i * 9, by + perpy * i * 4);
            X.stroke();
        }
        X.setLineDash([]);
        X.restore();
        X.globalAlpha = 1;
    },
    'depth_charge': (v, X) => {
        const s = v.spell;
        X.save();
        if (v.state <= 1) {
            addLightGlow(X, v.x, v.y, 46, s.core, s.c2, v.state === 1 ? 0.7 : 0.45);
            const glow = X.createRadialGradient(v.x, v.y, 2, v.x, v.y, 36);
            glow.addColorStop(0, s.core);
            glow.addColorStop(0.35, s.c2);
            glow.addColorStop(1, 'transparent');
            X.fillStyle = glow;
            X.globalAlpha = v.state === 1 ? 0.65 : 0.4;
            X.beginPath(); X.arc(v.x, v.y, 36, 0, Math.PI * 2); X.fill();

            X.globalAlpha = 0.9;
            X.fillStyle = '#17354f';
            X.beginPath(); X.arc(v.x, v.y, 11, 0, Math.PI * 2); X.fill();
            X.strokeStyle = s.c2; X.lineWidth = 2;
            X.beginPath(); X.arc(v.x, v.y, 11, 0, Math.PI * 2); X.stroke();
            X.fillStyle = s.core;
            X.fillRect(v.x - 4, v.y - 16, 8, 6);
        }
        if (v.state === 1) {
            X.globalAlpha = Math.min(0.6, v.age / 18 * 0.6);
            X.strokeStyle = s.core;
            X.lineWidth = 1.5;
            X.beginPath(); X.arc(v.x, v.y, s.exR * 0.35 + v.age * 2.5, 0, Math.PI * 2); X.stroke();
        }
        if (v.state === 2) {
            X.globalAlpha = Math.max(0, 0.45 - v.age * 0.03);
            X.fillStyle = s.core;
            X.fillRect(0, 0, W, H);
        }
        X.restore();
        X.globalAlpha = 1;
    },
    'hydra': (v, X) => {
        const s = v.spell;
        if (!v.poolY) return;
        X.save();
        X.globalAlpha = 0.5;
        const pool = X.createRadialGradient(v.cx, v.poolY, 4, v.cx, v.poolY, 42);
        pool.addColorStop(0, s.c2);
        pool.addColorStop(0.55, s.color);
        pool.addColorStop(1, 'transparent');
        X.fillStyle = pool;
        X.beginPath(); X.ellipse(v.cx, v.poolY + 2, 42, 12, 0, 0, Math.PI * 2); X.fill();

        for (const head of v.heads || []) {
            const neckMidX = (head.baseX + head.tipX) * 0.5;
            const neckMidY = Math.min(head.baseY, head.tipY) - 24 - head.lunge * 12;
            X.strokeStyle = s.color;
            X.lineWidth = 7;
            X.globalAlpha = 0.22;
            X.beginPath();
            X.moveTo(v.cx, v.poolY);
            X.quadraticCurveTo(neckMidX, neckMidY, head.tipX, head.tipY);
            X.stroke();

            X.strokeStyle = s.c2;
            X.lineWidth = 3.5;
            X.globalAlpha = 0.8;
            X.beginPath();
            X.moveTo(v.cx, v.poolY);
            X.quadraticCurveTo(neckMidX, neckMidY, head.tipX, head.tipY);
            X.stroke();

            const dir = Math.atan2(head.tipY - neckMidY, head.tipX - neckMidX);
            X.save();
            X.translate(head.tipX, head.tipY);
            X.rotate(dir);
            X.fillStyle = s.core;
            X.globalAlpha = 0.95;
            X.beginPath();
            X.moveTo(14, 0);
            X.lineTo(-8, -9);
            X.lineTo(-12, 0);
            X.lineTo(-8, 9);
            X.closePath();
            X.fill();
            X.strokeStyle = s.color;
            X.lineWidth = 1.5;
            X.stroke();
            X.fillStyle = '#1a4255';
            X.beginPath(); X.arc(6, -2, 1.8, 0, Math.PI * 2); X.fill();
            X.restore();
        }
        X.restore();
        X.globalAlpha = 1;
    },
    'mirror_pool': (v, X) => {
        if (!v.gy) return;
        const s = v.spell;
        const T = performance.now() * 0.002;
        const open = v.state === 0 ? Math.min(1, v.age / 18) : 1;
        const surfaceY = v.gy - 6 + Math.sin(v.age * 0.08) * 2;
        addLightGlow(X, v.tx, surfaceY, s.mirrorR * 1.5, s.core, s.c2, 0.45 * open);
        X.save();
        X.globalAlpha = 0.55 * open;
        const grad = X.createRadialGradient(v.tx, surfaceY, 6, v.tx, surfaceY, s.mirrorR * 1.1);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, s.core);
        grad.addColorStop(0.6, s.c2);
        grad.addColorStop(1, 'transparent');
        X.fillStyle = grad;
        X.beginPath(); X.ellipse(v.tx, surfaceY, s.mirrorR, 14, 0, 0, Math.PI * 2); X.fill();
        X.restore();
        for (let ring = 0; ring < 3; ring++) {
            drawCausticRing(X, v.tx, surfaceY, s.mirrorR * (0.65 + ring * 0.14), ring === 1 ? '#ffffff' : s.c2, (0.65 - ring * 0.15) * open, 0.16);
        }
        X.save();
        X.globalCompositeOperation = 'lighter';
        for (let g = 0; g < 5; g++) {
            const ga = T * (1 + g * 0.2) + g * 1.4;
            const gx = v.tx + Math.cos(ga) * s.mirrorR * 0.65;
            const gy = surfaceY + Math.sin(ga) * 6;
            const gg = X.createRadialGradient(gx, gy, 0, gx, gy, 8);
            gg.addColorStop(0, '#ffffff');
            gg.addColorStop(0.5, s.core);
            gg.addColorStop(1, 'transparent');
            X.fillStyle = gg;
            X.globalAlpha = 0.65 * open;
            X.beginPath(); X.arc(gx, gy, 8, 0, Math.PI * 2); X.fill();
        }
        X.restore();
        X.save();
        X.globalAlpha = 0.7 * open;
        X.strokeStyle = '#ffffff';
        X.lineWidth = 1.6;
        X.beginPath(); X.ellipse(v.tx, surfaceY - 1, s.mirrorR * 0.92, 10, 0, 0, Math.PI * 2); X.stroke();
        X.restore();
        X.globalAlpha = 1;
    },
};

// ── Revamp: spells novos (water-new.js) ──────────────────────────────────
import * as WaterNew from './water-new.js?v=1';
SPELL_DEFS.push(...WaterNew.DEFS);
Object.assign(FIRE_HANDLERS, WaterNew.FIRE_HANDLERS);
Object.assign(PROJ_HOOKS, WaterNew.PROJ_HOOKS);
Object.assign(TRAIL_EMITTERS, WaterNew.TRAIL_EMITTERS);
Object.assign(VFX_UPDATE, WaterNew.VFX_UPDATE);
Object.assign(VFX_DRAW, WaterNew.VFX_DRAW);
export const PROJ_DRAW = { ...WaterNew.PROJ_DRAW };
