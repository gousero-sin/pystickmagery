// ═══════════════════════════════════════════════════════════════════════════
// water.js — Water & Ice Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

const W = 1200, H = 800; // Expected canvas size

export const SPELL_DEFS = [
    { name: 'Ice Lance', icon: '❄️', key: '2', color: '#44ccff', c2: '#88eeff', core: '#eeffff', speed: 14, dmg: 15, mana: 8, cd: 150, r: 3, grav: .01, drag: 1, bounce: 2, exR: 0, exF: 0, trail: 'ice', piercing: true, desc: 'Fast piercing, bounces walls' },
    { name: 'Frost Nova', icon: '❆', key: ']', color: '#66ddff', c2: '#99eeff', core: '#fff', speed: 0, dmg: 12, mana: 20, cd: 500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isFrostNova: true, frostR: 80, frostSlow: 120, desc: 'Freezes all nearby enemies' },
    { name: 'Chain Frost', icon: '💎', key: '7', color: '#88eeff', c2: '#aaf4ff', core: '#fff', speed: 6, dmg: 18, mana: 18, cd: 500, r: 4, grav: .05, drag: .999, bounce: 5, exR: 22, exF: 4, trail: 'frost', chain: 3, chainR: 130, desc: 'Chains between targets' },
    { name: 'Water Geyser', icon: '⛲', key: 'R', color: '#4488ff', c2: '#88bbff', core: '#ddeeff', speed: 0, dmg: 25, mana: 20, cd: 600, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isGeyser: true, geyserW: 30, geyserH: 140, desc: 'Erupting water launches foes' },
    { name: 'Tsunami', icon: '🌊', key: 'F', color: '#1166dd', c2: '#44aadd', core: '#cceeff', speed: 0, dmg: 35, mana: 40, cd: 1200, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isTsunami: true, desc: 'Massive sweeping wave' },
    { name: 'Water Bubble', icon: '🫧', key: 'G', color: '#77ddff', c2: '#aaeeff', core: '#ffffff', speed: 0, dmg: 10, mana: 25, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isBubble: true, bubbleDur: 300, desc: 'Traps enemy in floating sphere' },
    { name: 'Healing Rain', icon: '🌧️', key: 'H', color: '#6688aa', c2: '#aabbdd', core: '#ddeeff', speed: 0, dmg: 0, mana: 30, cd: 1500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isRain: true, rainR: 80, rainDur: 300, healAmt: 0.5, manaAmt: 0.5, desc: 'Regens HP/Mana, slows enemies' },
    { name: 'Whirlpool', icon: '🌀', key: 'J', color: '#114488', c2: '#2266aa', core: '#88bbdd', speed: 0, dmg: 5, mana: 35, cd: 1000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isWhirlpool: true, whorlDur: 240, whorlR: 100, whorlStr: 0.8, desc: 'Ground vortex slows and pulls' },
    { name: 'Riptide', icon: '🌊', key: 'K', color: '#2255aa', c2: '#4488cc', core: '#aaddff', speed: 0, dmg: 12, mana: 20, cd: 700, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isRiptide: true, ripDur: 120, ripW: 200, ripF: 4, desc: 'Undertow ribbon drags bodies and shots back toward you' },
    { name: 'Depth Charge', icon: '💣', key: 'L', color: '#0a2244', c2: '#1155aa', core: '#88ccff', speed: 4, dmg: 50, mana: 30, cd: 1200, r: 6, grav: .08, drag: .998, bounce: 0, exR: 90, exF: 15, trail: 'water', isDepthCharge: true, sinkDur: 60, desc: 'Sinking bomb detonates with crushing pressure' },
    { name: 'Hydra Heads', icon: '🐉', key: 'P', color: '#1188aa', c2: '#44bbdd', core: '#ffffff', speed: 0, dmg: 15, mana: 35, cd: 1500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isHydra: true, hydraDur: 180, hydraHeads: 3, hydraRange: 140, desc: 'Water serpent heads emerge and auto-bite nearby foes' },
    { name: 'Mirror Pool', icon: '🪞', key: 'Q', color: '#79dcff', c2: '#b7f6ff', core: '#ffffff', speed: 0, dmg: 14, mana: 26, cd: 1100, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isMirrorPool: true, mirrorDur: 220, mirrorR: 68, mirrorMana: 0.35, desc: 'Reflective pool duplicates projectiles that skim its surface' },
    { name: 'Tidal Lock', icon: '🔒', key: 'O', color: '#2266bb', c2: '#55aadd', core: '#ddeeff', speed: 0, dmg: 8, mana: 28, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'water', isTidalLock: true, lockDur: 200, lockR: 50, desc: 'Traps nearest enemy in orbiting water sphere' },
    createManifestSpell({
        name: 'Glacier Path', icon: '🧊',
        color: '#52cfff', c2: '#a2f0ff', core: '#ffffff',
        manifestStyle: 'water', manifestEffect: 'water_chill', manifestProfile: 'ice_bridge', manifestGlyph: '*',
        manifestDuration: 900,
        mana: 24, cd: 900, manifestArc: 14, manifestThickness: 12, manifestSegmentHp: 34,
        desc: 'Manifest an ice span that chills foes, feeds mana, and slowly melts away'
    }),
    { name: 'Absolute Zero', icon: '❄️', key: 'B', color: '#88eeff', c2: '#ccffff', core: '#ffffff', speed: 0, dmg: 40, mana: 70, cd: 6000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isAbsoluteZero: true, desc: 'Freezes entire screen (Ultimate)' },
];

export const FIRE_HANDLERS = {
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
    isBubble: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'bubble', state: 0, age: 0, tx, ty, spell: s });
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
    isTidalLock: (s, ox, oy, tx, ty) => {
        let closest = null, minD = 999;
        for (const e of state.entities) { if (!e.active) continue; const d = Math.hypot(e.x + e.w / 2 - tx, e.y + e.h / 2 - ty); if (d < minD) { minD = d; closest = e; } }
        if (closest) state.vfxSequences.push({ type: 'tidal_lock', state: 0, age: 0, target: closest, tx, ty, spell: s });
        else { spawnP(tx, ty, s.color, 8, 'burst'); }
        return true;
    }
};

export const PROJ_HOOKS = {};
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
        if (!e.active || claimed.includes(e)) continue;
        const dist = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
        if (dist < best) {
            best = dist;
            target = e;
        }
    }
    return target;
}

export const VFX_UPDATE = {
    ...MANIFEST_VFX_UPDATE,
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
            if (v.age === 1) SoundFX.playSweep(100, 300, 'sine', 1.5, 0.3);
            if (v.age % 2 === 0) { for (let k = 0; k < 4; k++) state.particles.push({ x: v.cx + (Math.random() - .5) * 40, y: state.H - 20 - Math.random() * (v.age * 2), vx: v.facing * Math.random() * 2, vy: -Math.random() * 3 - 1, life: 25, ml: 25, color: Math.random() > .3 ? s.color : s.c2, size: 4 + Math.random() * 4, grav: .05, type: 'cloud' }); }
            state.dynamicLights.push({ x: v.cx, y: state.H - 60, r: 100, color: s.color, int: v.age / 30, life: 2, ml: 2 });
            state.shake(Math.min(v.age / 10, 3));
            if (v.age > 30) { v.state = 1; v.age = 0; SoundFX.playNoise(1.5, 0.5, 200, 'lowpass'); }
        } else if (v.state === 1) {
            v.cx += v.facing * 10;
            state.shake(6);
            state.dynamicLights.push({ x: v.cx, y: state.H - 80, r: 200, color: s.c2, int: 2, life: 2, ml: 2 });
            for (let k = 0; k < 8; k++) state.particles.push({ x: v.cx + (Math.random() - .5) * 50, y: state.H - Math.random() * 150, vx: v.facing * (Math.random() * 8 + 4), vy: (Math.random() - .5) * 6 - 2, life: 30, ml: 30, color: k % 4 === 0 ? '#fff' : Math.random() > .4 ? s.color : s.c2, size: 4 + Math.random() * 6, grav: .15, type: 'trail' });
            if (v.age % 3 === 0) spawnP(v.cx + v.facing * 20, state.H - 130 - Math.random() * 30, '#fff', 3, 'burst');
            if (v.age % 15 === 0) state.shockwaves.push({ x: v.cx, y: state.H - 30, r: 0, maxR: 60, life: 8, maxLife: 8, color: s.c2 });
            for (const e of state.entities) { if (!e.active) continue; if (Math.abs(e.x + e.w / 2 - v.cx) < 50 && e.y > state.H - 180) { if (v.age % 6 === 0) hurtEntity(e, 5, v.cx, e.y); e.vx += v.facing * 7 / (e.mass || 1); e.vy -= 3; } }
            if (v.cx < -120 || v.cx > state.W + 120) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
        }
    },
    'bubble': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (v.age === 1) { let cl = null, md = 999; for (const e of state.entities) { if (!e.active) continue; const d = Math.hypot(e.x + e.w / 2 - v.tx, e.y + e.h / 2 - v.ty); if (d < md) { md = d; cl = e; } } v.target = cl; if (!v.target) { spawnP(v.tx, v.ty, s.color, 10, 'burst'); const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); return; } }
            if (v.target && !v.target.active) { const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); return; }
            const ex = v.target.x + v.target.w / 2, ey = v.target.y + v.target.h / 2;
            for (let k = 0; k < 3; k++) { const a = v.age * 0.5 + k * Math.PI * 2 / 3, d = Math.max(5, 35 - v.age * 2); state.particles.push({ x: ex + Math.cos(a) * d, y: ey + Math.sin(a) * d, vx: -Math.cos(a) * 2, vy: -Math.sin(a) * 2, life: 10, ml: 10, color: s.c2, size: 3, grav: 0, type: 'cloud' }); }
            state.dynamicLights.push({ x: ex, y: ey, r: 50, color: s.color, int: v.age / 15, life: 2, ml: 2 });
            if (v.age > 15) { v.state = 1; v.age = 0; SoundFX.playSweep(400, 800, 'sine', 0.3, 0.2); }
        } else if (v.state === 1) {
            if (v.target && !v.target.active) { v.state = 2; v.age = 0; return; }
            state.frozenEntities.set(v.target, 5); v.target.vy = 0; v.target.vx *= 0.8;
            v.target.y += Math.sin(v.age * 0.08) * 0.6 - 0.15;
            if (v.age % 30 === 0) hurtEntity(v.target, s.dmg, v.target.x, v.target.y);
            const ex = v.target.x + v.target.w / 2, ey = v.target.y + v.target.h / 2;
            if (v.age % 4 === 0) { const a = Math.random() * Math.PI * 2; state.particles.push({ x: ex + Math.cos(a) * 25, y: ey + Math.sin(a) * 25, vx: 0, vy: -0.5, life: 12, ml: 12, color: '#fff', size: 1 + Math.random(), grav: 0, type: 'sparkle' }); }
            state.dynamicLights.push({ x: ex, y: ey, r: 50 + Math.sin(v.age * 0.1) * 10, color: s.c2, int: 1.2, life: 2, ml: 2 });
            if (v.age > s.bubbleDur) { v.state = 2; v.age = 0; }
        } else if (v.state === 2) {
            if (v.target) { const ex = v.target.x + v.target.w / 2, ey = v.target.y + v.target.h / 2; spawnP(ex, ey, '#fff', 20, 'explode'); spawnP(ex, ey, s.c2, 15, 'burst'); state.shockwaves.push({ x: ex, y: ey, r: 0, maxR: 50, life: 10, maxLife: 10, color: s.color }); state.dynamicLights.push({ x: ex, y: ey, r: 80, color: '#fff', int: 2, life: 8, ml: 8 }); SoundFX.playSweep(800, 1600, 'sine', 0.2, 0.1); }
            const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1);
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
    'tidal_lock': (v) => {
        const s = v.spell;
        if (!v.target?.active) { removeWaterVfx(v); return; }
        const target = v.target;
        if (v.state === 0) {
            if (v.age === 1) {
                v.cx = target.x + target.w / 2;
                v.cy = target.y + target.h / 2;
                SoundFX.playSweep(620, 220, 'sine', 0.28, 0.18);
            }
            if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - 0.5) * 22, v.cy + (Math.random() - 0.5) * 22, s.c2, 1, 'cloud');
            if (v.age > 14) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            const ex = target.x + target.w / 2;
            const ey = target.y + target.h / 2;
            v.cx += (ex - v.cx) * 0.2;
            v.cy += (ey - v.cy) * 0.2;
            const dx = v.cx - ex;
            const dy = v.cy - ey;
            target.vx += dx * 0.08 / (target.mass || 1);
            target.vy += dy * 0.08 / (target.mass || 1) - 0.22;
            target.vx *= 0.82;
            target.vy *= 0.74;
            if (v.age % 28 === 0) {
                hurtEntity(target, s.dmg, v.cx, v.cy);
                spawnP(v.cx, v.cy, s.core, 4, 'sparkle');
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.lockR * 1.6, color: s.c2, int: 0.65, life: 2, ml: 2 });
            if (v.age > s.lockDur) {
                v.state = 2;
                v.age = 0;
                target.vy -= 4;
                SoundFX.playNoise(0.2, 0.14, 1000, 'bandpass', 6);
            }
        } else if (v.state === 2) {
            if (v.age === 1) {
                spawnP(v.cx, v.cy, s.core, 12, 'burst');
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.lockR * 1.3, life: 12, maxLife: 12, color: s.c2 });
            }
            if (v.age > 10) removeWaterVfx(v);
        }
    }
};
export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW,
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
    'geyser': (v, X) => {
        if (v.state === 0) {
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
        if (v.state === 0) {
            X.globalAlpha = Math.min(0.5, v.age / 30);
            X.fillStyle = v.spell.color;
            X.fillRect(v.cx - 20, H - 100, 40, 100);
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            X.globalAlpha = 0.8;
            X.fillStyle = v.spell.color;
            X.beginPath(); X.moveTo(v.cx - v.facing * 40, H);
            X.quadraticCurveTo(v.cx, H - 80, v.cx + v.facing * 50, H - 150);
            X.lineTo(v.cx + v.facing * 60, H); X.fill();
            X.globalAlpha = 0.5; X.fillStyle = v.spell.c2;
            X.beginPath(); X.moveTo(v.cx - v.facing * 20, H);
            X.quadraticCurveTo(v.cx + v.facing * 20, H - 60, v.cx + v.facing * 30, H - 100);
            X.lineTo(v.cx + v.facing * 40, H); X.fill();
            X.globalAlpha = 1;
        }
    },
    'bubble': (v, X) => {
        if (v.state === 0 && v.target) {
            const ex = v.target.x + v.target.w / 2, ey = v.target.y + v.target.h / 2;
            X.globalAlpha = Math.min(0.5, v.age / 15);
            X.beginPath(); X.arc(ex, ey, 30, 0, Math.PI * 2); X.fillStyle = v.spell.color; X.fill();
            X.globalAlpha = 1;
        } else if (v.state === 1 && v.target) {
            const ex = v.target.x + v.target.w / 2, ey = v.target.y + v.target.h / 2;
            X.globalAlpha = 0.5;
            X.beginPath(); X.arc(ex, ey, 25, 0, Math.PI * 2); X.fillStyle = v.spell.color; X.fill();
            X.globalAlpha = 0.8; X.lineWidth = 2; X.strokeStyle = v.spell.c2; X.stroke();
            // Highlight
            X.globalAlpha = 0.9; X.fillStyle = '#fff';
            X.beginPath(); X.arc(ex - 8, ey - 10, 4, 0, Math.PI * 2); X.fill();
            X.globalAlpha = 1;
        }
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
        if (v.state === 1) {
            X.globalAlpha = Math.max(0, Math.min(0.8, 1 - v.age / v.spell.whorlDur));
            const grad = X.createRadialGradient(v.tx, v.gy, 0, v.tx, v.gy, v.spell.whorlR);
            grad.addColorStop(0, v.spell.c2); grad.addColorStop(0.5, v.spell.color); grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.save(); X.translate(v.tx, v.gy); X.scale(1, 0.25); X.rotate(v.age * 0.1);
            X.beginPath(); X.arc(0, 0, v.spell.whorlR, 0, Math.PI * 2); X.fill();
            // Inner spiral
            X.lineWidth = 3; X.strokeStyle = '#fff'; X.globalAlpha *= 0.6;
            X.beginPath(); X.moveTo(0, 0);
            for (let a = 0; a < Math.PI * 6; a += 0.3) { X.lineTo(Math.cos(a + v.age * 0.2) * a * 5, Math.sin(a + v.age * 0.2) * a * 5); }
            X.stroke();
            X.restore(); X.globalAlpha = 1;
        }
    },
    'riptide': (v, X) => {
        const s = v.spell;
        const ax = v.tx, ay = v.ty, bx = v.ox, by = v.oy;
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const perpx = -dy / len, perpy = dx / len;
        const progress = v.state === 0 ? Math.min(1, v.age / 12) : Math.max(0, 1 - v.age / (s.ripDur + 8) * 0.15);
        const width = s.ripW * 0.22 * progress;

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
        const open = v.state === 0 ? Math.min(1, v.age / 18) : 1;
        const surfaceY = v.gy - 6 + Math.sin(v.age * 0.08) * 2;
        X.save();
        X.globalAlpha = 0.5 * open;
        const grad = X.createRadialGradient(v.tx, surfaceY, 6, v.tx, surfaceY, s.mirrorR * 1.1);
        grad.addColorStop(0, s.core);
        grad.addColorStop(0.35, s.c2);
        grad.addColorStop(0.7, s.color + '88');
        grad.addColorStop(1, 'transparent');
        X.fillStyle = grad;
        X.beginPath(); X.ellipse(v.tx, surfaceY, s.mirrorR, 14, 0, 0, Math.PI * 2); X.fill();

        X.globalAlpha = 0.75 * open;
        X.lineWidth = 2;
        X.strokeStyle = s.core;
        X.beginPath(); X.ellipse(v.tx, surfaceY, s.mirrorR * 0.92, 11, 0, 0, Math.PI * 2); X.stroke();
        X.globalAlpha = 0.18 * open;
        X.fillStyle = '#ffffff';
        X.fillRect(v.tx - s.mirrorR * 0.72, surfaceY - 2, s.mirrorR * 1.44, 4);
        X.restore();
        X.globalAlpha = 1;
    },
    'tidal_lock': (v, X) => {
        if (!v.target?.active || v.cx == null) return;
        const s = v.spell;
        X.save();
        const phase = performance.now() * 0.004;
        const alpha = v.state === 0 ? Math.min(0.7, v.age / 14 * 0.7) : 0.78;

        X.globalAlpha = alpha * 0.35;
        X.fillStyle = s.color;
        X.beginPath(); X.arc(v.cx, v.cy, s.lockR, 0, Math.PI * 2); X.fill();

        for (let ring = 0; ring < 3; ring++) {
            const rot = phase + ring * Math.PI / 3;
            X.globalAlpha = alpha;
            X.strokeStyle = ring === 1 ? s.core : s.c2;
            X.lineWidth = 2;
            X.beginPath();
            X.ellipse(v.cx, v.cy, s.lockR * (0.68 + ring * 0.12), 10 + ring * 5, rot, 0, Math.PI * 2);
            X.stroke();
        }

        X.globalAlpha = 0.92 * alpha;
        X.fillStyle = s.core;
        for (let i = 0; i < 4; i++) {
            const a = phase * 1.4 + i * Math.PI / 2;
            X.beginPath();
            X.arc(v.cx + Math.cos(a) * s.lockR * 0.78, v.cy + Math.sin(a * 1.2) * 12, 3, 0, Math.PI * 2);
            X.fill();
        }
        X.restore();
        X.globalAlpha = 1;
    }
};
