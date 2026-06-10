// ═══════════════════════════════════════════════════════════════════════════
// void.js — Void & Dark Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { spawnP, explode, hurtEntity } from '../core/utils.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';

export const SPELL_DEFS = [
    { name: 'Gravity Well', icon: '🌀', key: '5', color: '#7722cc', c2: '#9944ee', core: '#bb88ff', speed: 5, dmg: 5, mana: 30, cd: 900, r: 8, grav: 0, drag: .97, bounce: 0, trail: 'void', isWell: true, wellDur: 240, wellR: 85, wellStr: .6, desc: 'Vortex that pulls everything' },
    { name: 'Black Hole', icon: '⚫', key: 'X', color: '#220044', c2: '#440088', core: '#6600cc', speed: 3, dmg: 8, mana: 50, cd: 2000, r: 10, grav: 0, drag: .96, bounce: 0, trail: 'void', isWell: true, wellDur: 360, wellR: 120, wellStr: 1.2, desc: 'Massive pull — devours all' },
    { name: 'Soul Drain', icon: '👻', key: 'O', color: '#cc44ff', c2: '#dd88ff', core: '#eeccff', speed: 6, dmg: 20, mana: 18, cd: 400, r: 4, grav: 0, drag: .998, bounce: 0, exR: 0, exF: 0, trail: 'soul', homing: true, homeStr: .1, isDrain: true, healAmt: 15, desc: 'Heals you on hit' },
    { name: 'Shadow Step', icon: '🌑', key: '\\', category: 'Teleport', color: '#442266', c2: '#6644aa', core: '#9966dd', speed: 0, dmg: 0, mana: 22, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'shadow', isTeleport: true, teleportRange: 170, teleportWindup: 24, teleportTravel: 7, desc: 'Short delayed blink with a punishable shadow wind-up' },
    { name: 'Dimensional Rift', icon: '🕳️', key: 'F', color: '#6622aa', c2: '#8844cc', core: '#bb88ff', speed: 0, dmg: 25, mana: 30, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'void', isDimensionalRift: true, riftR: 60, riftDur: 180, desc: 'Portal that teleports enemies randomly' },
    { name: 'Entropy', icon: '☠️', key: 'G', color: '#553388', c2: '#7755aa', core: '#aa88dd', speed: 0, dmg: 3, mana: 25, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'void', isEntropy: true, entR: 80, entDur: 200, desc: 'Decaying field — slows and damages' },
    { name: 'Void Mine', icon: '💣', key: 'F', category: 'Trap', color: '#330066', c2: '#6622aa', core: '#aa55ff', speed: 0, dmg: 40, mana: 22, cd: 700, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'void', isVoidMine: true, mineTriggerR: 35, mineBlastR: 70, mineDur: 600, desc: 'Invisible trap — detonates on proximity' },
    createHoldSpell({
        name: 'Abyss Grip', icon: '🖐️', key: 'A',
        color: '#5f2ac0', c2: '#b387ff', core: '#efe0ff',
        mana: 20, cd: 980, dmg: 4,
        holdStyle: 'void', holdProfile: 'void_grip',
        holdR: 80, holdDrain: 0.24, holdForce: 0.32, holdDealsDamage: true,
        releaseR: 94, releaseDmg: 24,
        desc: 'Hold to suspend a focal target in a crushing void while nearby matter folds inward'
    }),
    createManifestSpell({
        name: 'Null Causeway', icon: '🕳️',
        color: '#5a26b5', c2: '#8b57ff', core: '#d4b4ff',
        manifestStyle: 'void', manifestEffect: 'void_pull', manifestProfile: 'fragments', manifestGlyph: 'o',
        manifestDuration: 660,
        mana: 26, cd: 950, manifestArc: 12, manifestThickness: 11, manifestSegmentHp: 30,
        desc: 'Manifest floating null fragments that drag matter into their path'
    }),
    { name: 'Singularity', icon: '🌌', key: 'N', color: '#110033', c2: '#330066', core: '#aa44ff', speed: 0, dmg: 60, mana: 90, cd: 10000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'void', isSingularity: true, desc: 'Devours space and time (Ultimate)' }
];

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function removeVoidVfx(v) {
    const idx = state.vfxSequences.indexOf(v);
    if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

export const FIRE_HANDLERS = {
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    isSingularity: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'singularity', state: 0, age: 0, tx, ty, spell: s });
        state.player.inv = true;
        return true;
    },
    isTeleport: (s, ox, oy, tx, ty) => {
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const dx = tx - px;
        const dy = ty - py;
        const len = Math.hypot(dx, dy) || 1;
        const dist = Math.min(s.teleportRange || 170, len);
        const safeX = clamp(px + dx / len * dist, 20, state.W - 20);
        const safeY = clamp(py + dy / len * dist, 28, state.H - 30);
        state.vfxSequences.push({ type: 'teleport', state: 0, age: 0, fx: px, fy: py, tx: safeX, ty: safeY, spell: s, sparks: [] });
        state.player.inv = false;
        return true;
    },
    isDimensionalRift: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'dimensional_rift', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playSweep(600, 200, 'sine', 0.6, 0.4);
        return true;
    },
    isEntropy: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'entropy_field', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        return true;
    },
    isVoidMine(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'void_mine', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playTone(200, 'sine', 0.15, 0.2);
        // Subtle placement particles
        for (let i = 0; i < 5; i++) {
            state.particles.push({
                x: tx + (Math.random()-.5)*20, y: ty + (Math.random()-.5)*20,
                vx: 0, vy: -0.5, life: 15, ml: 15, color: s.color, size: 1, grav: 0, type: 'void'
            });
        }
        return true;
    }
};

export const PROJ_HOOKS = {
    'void': {
        onLand: (p) => {
            if (p.spell.isWell) {
                state.vfxSequences.push({ type: 'blackhole', state: 0, age: 0, cx: p.x, cy: p.y, spell: p.spell });
            }
        }
    },
    'soul': {
        onUpdate: (p) => {
            if (Math.random() < 0.3) spawnP(p.x, p.y, p.color, 1, 'smoke');
        },
        onLand: (p) => {
            if (p.spell.isDrain) {
                state.vfxSequences.push({ type: 'soul_drain', state: 0, age: 0, cx: p.x, cy: p.y, spell: p.spell });
            }
        }
    }
};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    'void_mine': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            // Armed — nearly invisible, check proximity
            // Very subtle shimmer particles
            if (v.age % 20 === 0) {
                state.particles.push({
                    x: v.cx + (Math.random()-.5)*10, y: v.cy + (Math.random()-.5)*10,
                    vx: 0, vy: -0.3, life: 12, ml: 12, color: s.c2, size: 1, grav: 0, type: 'void'
                });
            }
            // Check enemy proximity
            for (const e of state.entities) {
                if (!e.active) continue;
                const d = Math.hypot(e.x + e.w/2 - v.cx, e.y + e.h/2 - v.cy);
                if (d < s.mineTriggerR) {
                    v.state = 1;
                    v.age = 0;
                    v.triggeredBy = e;
                    SoundFX.playSweep(100, 800, 'square', 0.5, 0.1);
                    break;
                }
            }
            if (v.age > s.mineDur) {
                // Fizzle out
                spawnP(v.cx, v.cy, s.c2, 5, 'void');
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        } else if (v.state === 1) {
            // Triggered — brief implosion then detonation
            if (v.age < 8) {
                // Implosion: suck particles inward
                for (let i = 0; i < 5; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const r = s.mineBlastR * (1 - v.age/8);
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r,
                        vx: -Math.cos(a) * 8, vy: -Math.sin(a) * 8,
                        life: 6, ml: 6, color: s.c2, size: 2, grav: 0, type: 'void'
                    });
                }
                // Pull enemies in
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dx = v.cx - (e.x + e.w/2), dy = v.cy - (e.y + e.h/2);
                    const d = Math.hypot(dx, dy);
                    if (d < s.mineBlastR) {
                        e.vx += (dx/d) * 2;
                        e.vy += (dy/d) * 2;
                    }
                }
            } else if (v.age === 8) {
                // Detonation
                explode(v.cx, v.cy, s.mineBlastR, 14, s.dmg, s.color, s.core);
                state.shake(15);
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 200, color: s.core, int: 4, life: 12, ml: 12 });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.mineBlastR, life: 10, maxLife: 10, color: s.core });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.mineBlastR * 0.6, life: 6, maxLife: 6, color: '#ffffff' });
                SoundFX.playNoise(0.8, 0.4, 400, 'lowpass');
                SoundFX.playSweep(800, 200, 'square', 0.6, 0.3);
                spawnP(v.cx, v.cy, s.core, 30, 'explode');
                spawnP(v.cx, v.cy, s.color, 20, 'burst');
            }
            if (v.age > 25) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'dimensional_rift': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            // Pull enemies toward center
            for (const e of state.entities) {
                if (!e.active) continue;
                const dist = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                if (dist < s.riftR) {
                    const angle = Math.atan2(v.cy - (e.y + e.h / 2), v.cx - (e.x + e.w / 2));
                    e.vx += Math.cos(angle) * 0.3;
                    e.vy += Math.sin(angle) * 0.3;
                }
            }

            // Teleport entities in center
            if (v.age % 20 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dist = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                    if (dist < 25) {
                        const oldX = e.x + e.w / 2, oldY = e.y + e.h / 2;
                        e.x = Math.random() * (state.W - 200) + 100 - e.w / 2;
                        e.y = e.y;
                        hurtEntity(e, s.dmg, v.cx, v.cy);
                        spawnP(oldX, oldY, s.color, 4, 'void');
                        spawnP(e.x + e.w / 2, e.y + e.h / 2, s.color, 4, 'void');
                    }
                }
            }

            if (v.age % 3 === 0) spawnP(v.cx + (Math.random() - 0.5) * 60, v.cy + (Math.random() - 0.5) * 60, s.color, 2, 'void');
            if (v.age > s.riftDur) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'entropy_field': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            // Damage and slow entities
            if (v.age % 8 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dist = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                    if (dist < s.entR) {
                        hurtEntity(e, s.dmg, v.cx, v.cy);
                        e.vx *= 0.85;
                        e.vy *= 0.9;
                        spawnP(e.x + e.w / 2, e.y + e.h / 2, '#6633aa', 2, 'dust');
                    }
                }
            }

            // Spawn dissolving particles
            if (v.age % 4 === 0) spawnP(v.cx + (Math.random() - 0.5) * s.entR, v.cy + (Math.random() - 0.5) * s.entR, s.color, 1, 'smoke');

            // Dynamic light
            const currentR = s.entR * (1 - v.age / (s.entDur * 1.5));
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: currentR * 0.8, color: s.color, int: -0.5, life: 2, ml: 2 });

            if (v.age > s.entDur) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'blackhole': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - .5) * s.wellR, v.cy + (Math.random() - .5) * s.wellR, '#220044', 1, 'void');
            if (v.age > 20) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            if (v.age === 1) { spawnP(v.cx, v.cy, s.color, 15, 'explode'); state.shake(4); }
            if (v.age > 5) {
                state.gravityWells.push({ x: v.cx, y: v.cy, r: s.wellR, str: s.wellStr, life: s.wellDur, maxLife: s.wellDur, color: s.color });
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'soul_drain': (v) => {
        const s = v.spell;
        if (v.state === 0) { // Extract souls
            spawnP(v.cx, v.cy, s.color, 5, 'sparkle');
            if (v.age > 4) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) { // Pull to player
            const px = state.player.x + state.player.w / 2, py = state.player.y + state.player.h / 2;
            v.cx += (px - v.cx) * 0.15; v.cy += (py - v.cy) * 0.15;
            state.particles.push({ x: v.cx, y: v.cy, vx: 0, vy: 0, life: 10, ml: 10, color: s.c2, size: 4, grav: 0, type: 'sparkle' });
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 30, color: s.c2, int: 1, life: 2, ml: 2 });
            if (Math.hypot(px - v.cx, py - v.cy) < 15) {
                state.player.hp = Math.min(state.player.maxHp, state.player.hp + s.healAmt);
                spawnP(px, py, '#44ff44', 10, 'sparkle'); state.dynamicLights.push({ x: px, y: py, r: 50, color: '#44ff44', int: 1.5, life: 10, ml: 10 });
                state.damageNumbers.push({ x: px, y: py - 15, val: s.healAmt, life: 70, vy: -2, color: '#44ff44', sc: 1.5 });
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'teleport': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            state.player.castAnim = 280; state.player.castType = 'front_pose';
            state.player.vx *= 0.52; state.player.vy *= 0.52;
            state.player.inv = false;
            if (v.age === 1) { SoundFX.playSweep(600, 160, 'sine', 0.45, 0.34); spawnP(v.fx, v.fy, s.color, 12, 'void'); }
            if (v.age % 3 === 0) {
                const t = v.age / Math.max(1, s.teleportWindup || 24);
                state.particles.push({
                    x: v.fx + (Math.random() - .5) * (20 + t * 32),
                    y: v.fy + (Math.random() - .5) * (22 + t * 32),
                    vx: 0, vy: -0.25, life: 18, ml: 18, color: Math.random() > 0.5 ? s.c2 : s.color, size: 1.5, grav: -0.01, type: 'void'
                });
            }
            state.dynamicLights.push({ x: v.fx, y: v.fy, r: 48 + v.age * 2.2, color: s.color, int: 1.1, life: 2, ml: 2 });
            if (v.age >= (s.teleportWindup || 24)) {
                v.state = 1;
                v.age = 0;
                state.player.inv = true;
                SoundFX.playNoise(0.22, 0.1, 260, 'lowpass');
            }
        } else if (v.state === 1) {
            const travel = s.teleportTravel || 7;
            const t = Math.min(1, v.age / travel);
            const ease = t * t * (3 - 2 * t);
            state.player.x = v.fx + (v.tx - v.fx) * ease - state.player.w / 2;
            state.player.y = v.fy + (v.ty - v.fy) * ease - state.player.h / 2;
            state.player.vx = 0; state.player.vy = 0;
            state.dynamicLights.push({ x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2, r: 70, color: s.c2, int: 1.4, life: 2, ml: 2 });
            if (v.age >= travel) {
                let onG = false;
                for (const p of state.platforms) { if (state.player.x + state.player.w > p.x && state.player.x < p.x + p.w && state.player.y + state.player.h >= p.y && state.player.y < p.y + p.h) { state.player.y = p.y - state.player.h; onG = true; break; } }
                state.player.vy = onG ? 0 : -1.8;
                spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, s.color, 16, 'burst');
                SoundFX.playSweep(300, 720, 'sine', 0.38, 0.22);
                state.player.inv = false;
                v.state = 2;
                v.age = 0;
            }
        } else if (v.state === 2) {
            const px = state.player.x + state.player.w / 2;
            const py = state.player.y + state.player.h / 2;
            if (v.age % 3 === 0) spawnP(px + (Math.random() - .5) * 22, py + (Math.random() - .5) * 22, s.c2, 1, 'void');
            state.dynamicLights.push({ x: px, y: py, r: Math.max(20, 82 - v.age * 4), color: s.c2, int: 0.8, life: 2, ml: 2 });
            if (v.age > 14) removeVoidVfx(v);
        }
    },
    'singularity': (v) => {
        const s = v.spell;
        if (v.state === 0) { // Hover and channel — void particles converge
            if (v.age === 1) { SoundFX.playSweep(200, 800, 'sine', 2.0, 0.5); state.player.castAnim = 280; state.player.castType = 'up'; }
            state.player.vy = 0; state.player.vx = 0;
            state.player.y += Math.sin(performance.now() * 0.005) * 0.5;
            // Converging void particles from all directions
            if (v.age % 1 === 0) {
                for (let k = 0; k < 3; k++) {
                    const a = Math.random() * Math.PI * 2, d = 150 + Math.random() * 100;
                    state.particles.push({ x: v.tx + Math.cos(a) * d, y: v.ty + Math.sin(a) * d, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 3, life: 25, ml: 25, color: k === 0 ? s.core : s.c2, size: 2 + Math.random() * 2, grav: 0, type: 'void' });
                }
            }
            // Growing dark core
            state.dynamicLights.push({ x: v.tx, y: v.ty, r: 40 + v.age * 2, color: s.core, int: 0.5 + v.age / 60, life: 2, ml: 2 });
            state.shake(Math.min(v.age / 20, 4));
            if (v.age > 60) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) { // Active singularity — pulls everything in
            if (v.age === 1) { SoundFX.playNoise(1.5, 0.8, 200, 'lowpass'); state.shake(15); }
            state.player.vy = 0; state.player.vx = 0; state.player.castAnim = 280;
            // Sustained gravity well
            state.gravityWells.push({ x: v.tx, y: v.ty, r: 250, str: 2.5, life: 2, maxLife: 2, color: '#110033' });
            // Accretion disk particles
            for (let k = 0; k < 4; k++) {
                const a = v.age * 0.2 + k * Math.PI / 2;
                const d = 30 + Math.sin(v.age * 0.1 + k) * 15;
                state.particles.push({ x: v.tx + Math.cos(a) * d, y: v.ty + Math.sin(a) * d * 0.4, vx: Math.cos(a + Math.PI / 2) * 4, vy: Math.sin(a + Math.PI / 2) * 1.5, life: 12, ml: 12, color: k % 2 ? s.core : '#ff44aa', size: 2 + Math.random() * 3, grav: 0, type: 'trail' });
            }
            // Outer void tendrils
            if (v.age % 3 === 0) {
                const a = Math.random() * Math.PI * 2;
                spawnP(v.tx + Math.cos(a) * (200 - v.age * 3), v.ty + Math.sin(a) * (200 - v.age * 3), s.c2, 2, 'void');
            }
            state.dynamicLights.push({ x: v.tx, y: v.ty, r: 200, color: s.core, int: 2 + Math.sin(v.age * 0.15) * 1, life: 2, ml: 2 });
            state.shake(8 + Math.sin(v.age * 0.1) * 4);
            // Damage entities pulled in
            if (v.age % 10 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dist = Math.hypot(e.x + e.w / 2 - v.tx, e.y + e.h / 2 - v.ty);
                    if (dist < 200) hurtEntity(e, Math.floor(s.dmg * 0.15), v.tx, v.ty);
                }
            }
            if (v.age > 60) { v.state = 2; v.age = 0; }
        } else if (v.state === 2) { // Collapse and massive explosion
            if (v.age === 1) {
                SoundFX.playSweep(100, 400, 'sawtooth', 1.5, 0.8);
                SoundFX.playNoise(2.0, 0.6, 100, 'lowpass');
                state.player.inv = false; state.player.castAnim = 0;
                explode(v.tx, v.ty, 280, 30, s.dmg, s.color, s.c2);
                for (let k = 0; k < 10; k++) state.shockwaves.push({ x: v.tx, y: v.ty, r: 0, maxR: 250 + Math.random() * 150, life: 15 + k * 4, maxLife: 15 + k * 4, color: k % 3 === 0 ? '#fff' : k % 3 === 1 ? s.core : s.c2 });
                state.dynamicLights.push({ x: v.tx, y: v.ty, r: 500, color: '#fff', int: 5, life: 8, ml: 8 });
                state.dynamicLights.push({ x: v.tx, y: v.ty, r: 300, color: s.core, int: 4, life: 15, ml: 15 });
                state.shake(50);
                spawnP(v.tx, v.ty, s.core, 60, 'burst');
                spawnP(v.tx, v.ty, '#fff', 30, 'explode');
            }
            if (v.age > 60) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    }
};

export const VFX_DRAW = {
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    'teleport': (v, X) => {
        const s = v.spell;
        const wind = s.teleportWindup || 24;
        X.save();
        X.globalCompositeOperation = 'lighter';
        if (v.state === 0) {
            const prep = Math.min(1, v.age / wind);
            const r = 18 + prep * 44;
            X.strokeStyle = s.c2;
            X.lineWidth = 2 + prep * 2;
            X.globalAlpha = 0.25 + prep * 0.45;
            X.beginPath();
            X.arc(v.fx, v.fy, r, 0, Math.PI * 2);
            X.stroke();
            X.strokeStyle = s.core;
            X.lineWidth = 1.2;
            X.setLineDash([8, 7]);
            X.lineDashOffset = -v.age * 2.4;
            X.beginPath();
            X.arc(v.fx, v.fy, Math.max(4, r * (1 - prep * 0.45)), 0, Math.PI * 2);
            X.stroke();
            X.setLineDash([]);
        } else if (v.state === 1) {
            X.strokeStyle = s.c2;
            X.lineWidth = 5;
            X.globalAlpha = Math.max(0.2, 1 - v.age / (s.teleportTravel || 7));
            X.beginPath();
            X.moveTo(v.fx, v.fy);
            X.lineTo(v.tx, v.ty);
            X.stroke();
        } else {
            const a = Math.max(0, 1 - v.age / 14);
            X.strokeStyle = s.core;
            X.lineWidth = 2;
            X.globalAlpha = a;
            X.beginPath();
            X.arc(v.tx, v.ty, 16 + v.age * 4, 0, Math.PI * 2);
            X.stroke();
        }
        X.restore();
        X.globalAlpha = 1;
    },
    'void_mine': (v, X) => {
        const s = v.spell;
        if (v.state === 0) {
            // Nearly invisible — faint shimmer
            X.globalAlpha = 0.08 + Math.sin(v.age * 0.05) * 0.04;
            const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, 15);
            grad.addColorStop(0, s.core);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.beginPath();
            X.arc(v.cx, v.cy, 15, 0, Math.PI * 2);
            X.fill();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            if (v.age < 8) {
                // Implosion vortex
                X.globalAlpha = 0.5;
                const r = s.mineBlastR * (1 - v.age / 8);
                const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r);
                grad.addColorStop(0, s.color);
                grad.addColorStop(0.5, s.c2 + '44');
                grad.addColorStop(1, 'transparent');
                X.fillStyle = grad;
                X.beginPath();
                X.arc(v.cx, v.cy, r, 0, Math.PI * 2);
                X.fill();
            } else {
                // Explosion flash
                X.globalAlpha = Math.max(0, 1 - (v.age - 8) / 17) * 0.5;
                X.fillStyle = s.core;
                X.beginPath();
                X.arc(v.cx, v.cy, s.mineBlastR, 0, Math.PI * 2);
                X.fill();
            }
            X.globalAlpha = 1;
        }
    },
    'dimensional_rift': (v, X) => {
        const s = v.spell;
        // Draw swirling void portal — concentric rotating circles
        X.save();
        X.translate(v.cx, v.cy);
        for (let i = 0; i < 3; i++) {
            const angle = v.age * (0.05 + i * 0.02);
            const r = 20 + i * 15;
            X.strokeStyle = i % 2 ? s.color : s.c2;
            X.lineWidth = 2;
            X.globalAlpha = 0.6 - i * 0.1;
            X.beginPath();
            X.arc(0, 0, r, angle, angle + Math.PI);
            X.stroke();
            X.beginPath();
            X.arc(0, 0, r, angle + Math.PI, angle + Math.PI * 2);
            X.stroke();
        }
        // Inner glow
        X.fillStyle = s.core;
        X.globalAlpha = 0.3 + Math.sin(v.age * 0.1) * 0.2;
        X.beginPath();
        X.arc(0, 0, 10, 0, Math.PI * 2);
        X.fill();
        X.restore();
        X.globalAlpha = 1;
    },
    'entropy_field': (v, X) => {
        const s = v.spell;
        const currentR = s.entR * (1 - v.age / (s.entDur * 1.5));
        // Semi-transparent dark purple fill
        X.fillStyle = s.color;
        X.globalAlpha = 0.4 * (1 - v.age / s.entDur);
        X.beginPath();
        X.arc(v.cx, v.cy, currentR, 0, Math.PI * 2);
        X.fill();

        // Wispy tendrils
        X.strokeStyle = s.c2;
        X.lineWidth = 1;
        X.globalAlpha = 0.3 * (1 - v.age / s.entDur);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = v.cx + Math.cos(angle) * currentR * 0.7;
            const y1 = v.cy + Math.sin(angle) * currentR * 0.7;
            const x2 = v.cx + Math.cos(angle) * currentR * 1.1;
            const y2 = v.cy + Math.sin(angle) * currentR * 1.1;
            X.beginPath();
            X.moveTo(x1, y1);
            X.lineTo(x2, y2);
            X.stroke();
        }
        X.globalAlpha = 1;
    },
    'blackhole': (v, X) => {
        if (v.state === 0) {
            const r = v.spell.wellR * (1 - v.age / 20);
            X.strokeStyle = v.spell.color; X.lineWidth = 3; X.globalAlpha = 0.8; X.beginPath(); X.arc(v.cx, v.cy, r, 0, Math.PI * 2); X.stroke();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            X.fillStyle = v.spell.color; X.globalAlpha = (1 - v.age / 5) * 0.8; X.beginPath(); X.arc(v.cx, v.cy, v.spell.wellR, 0, Math.PI * 2); X.fill(); X.globalAlpha = 1;
        }
    },
    'singularity': (v, X) => {
        const s = v.spell;
        if (v.state === 0) {
            // Growing dark void at target
            const r = Math.min(v.age * 0.5, 25);
            const grad = X.createRadialGradient(v.tx, v.ty, 0, v.tx, v.ty, r * 2);
            grad.addColorStop(0, '#050011'); grad.addColorStop(0.5, s.color); grad.addColorStop(1, 'transparent');
            X.fillStyle = grad; X.globalAlpha = v.age / 60; X.beginPath(); X.arc(v.tx, v.ty, r * 2, 0, Math.PI * 2); X.fill(); X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Event horizon — dark circle with accretion disk
            const coreR = 15 + v.age * 0.3;
            X.fillStyle = '#020008'; X.beginPath(); X.arc(v.tx, v.ty, coreR, 0, Math.PI * 2); X.fill();
            // Accretion disk rings
            X.save(); X.translate(v.tx, v.ty); X.scale(1, 0.35);
            for (let j = 0; j < 4; j++) {
                const rr = coreR + 10 + j * 12;
                X.strokeStyle = j % 2 ? s.core : '#ff44aa'; X.lineWidth = 3 - j * 0.5; X.globalAlpha = 0.6 - j * 0.1;
                X.beginPath(); X.arc(0, 0, rr, 0, Math.PI * 2); X.stroke();
            }
            X.restore();
            // Pulsing outer rings
            X.strokeStyle = s.c2; X.lineWidth = 1; X.globalAlpha = 0.3 + Math.sin(v.age * 0.15) * 0.15;
            for (let j = 0; j < 3; j++) { X.beginPath(); X.arc(v.tx, v.ty, coreR + 40 + j * 25 + Math.sin(v.age * 0.1 + j) * 10, 0, Math.PI * 2); X.stroke(); }
            X.globalAlpha = 1;
        } else if (v.state === 2) {
            // White flash fading
            const a = Math.max(0, 1 - v.age / 20);
            X.fillStyle = '#fff'; X.globalAlpha = a * 0.8; X.fillRect(0, 0, state.W, state.H);
            X.fillStyle = s.core; X.globalAlpha = a * 0.5; X.beginPath(); X.arc(v.tx, v.ty, 250 + v.age * 3, 0, Math.PI * 2); X.fill();
            X.globalAlpha = 1;
        }
    }
};
