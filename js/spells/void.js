// ═══════════════════════════════════════════════════════════════════════════
// void.js — Void & Dark Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { spawnP, explode, hurtEntity } from '../core/utils.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

export const SPELL_DEFS = [
    { name: 'Gravity Well', icon: '🌀', key: '5', color: '#7722cc', c2: '#9944ee', core: '#bb88ff', speed: 5, dmg: 5, mana: 30, cd: 900, r: 8, grav: 0, drag: .97, bounce: 0, trail: 'void', isWell: true, wellDur: 240, wellR: 85, wellStr: .6, desc: 'Vortex that pulls everything' },
    { name: 'Black Hole', icon: '⚫', key: 'X', color: '#220044', c2: '#440088', core: '#6600cc', speed: 3, dmg: 8, mana: 50, cd: 2000, r: 10, grav: 0, drag: .96, bounce: 0, trail: 'void', isWell: true, wellDur: 360, wellR: 120, wellStr: 1.2, desc: 'Massive pull — devours all' },
    { name: 'Soul Drain', icon: '👻', key: 'O', color: '#cc44ff', c2: '#dd88ff', core: '#eeccff', speed: 6, dmg: 20, mana: 18, cd: 400, r: 4, grav: 0, drag: .998, bounce: 0, exR: 0, exF: 0, trail: 'soul', homing: true, homeStr: .1, isDrain: true, healAmt: 15, desc: 'Heals you on hit' },
    { name: 'Shadow Step', icon: '🌑', key: '\\', color: '#442266', c2: '#6644aa', core: '#9966dd', speed: 0, dmg: 25, mana: 15, cd: 300, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'shadow', isTeleport: true, desc: 'Teleport to cursor + AoE' },
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

export const FIRE_HANDLERS = {
    ...MANIFEST_FIRE_HANDLERS,
    isSingularity: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'singularity', state: 0, age: 0, tx, ty, spell: s });
        state.player.inv = true;
        return true;
    },
    isTeleport: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'teleport', state: 0, age: 0, fx: ox, fy: oy, tx, ty, spell: s });
        state.player.inv = true;
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
    ...MANIFEST_VFX_UPDATE,
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
            state.player.castAnim = 280; state.player.castType = 'front_pose'; state.player.vx = 0; state.player.vy = 0;
            if (v.age === 1) { SoundFX.playSweep(800, 400, 'sine', 0.5, 0.3); spawnP(v.fx, v.fy, s.color, 20, 'void'); }
            state.dynamicLights.push({ x: v.fx, y: v.fy, r: 80, color: s.color, int: 2, life: 2, ml: 2 });
            if (v.age > 10) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            state.player.x = v.tx - state.player.w / 2; state.player.y = v.ty - state.player.h / 2;
            let onG = false;
            for (const p of state.platforms) { if (state.player.x + state.player.w > p.x && state.player.x < p.x + p.w && state.player.y + state.player.h >= p.y && state.player.y < p.y + p.h) { state.player.y = p.y - state.player.h; onG = true; break; } }
            state.player.vy = onG ? 0 : -2;
            explode(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 80, 10, s.dmg, s.color, s.c2);
            spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, s.color, 20, 'burst');
            SoundFX.playSweep(400, 800, 'sine', 0.5, 0.3);
            state.player.inv = false;
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
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
    ...MANIFEST_VFX_DRAW,
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
