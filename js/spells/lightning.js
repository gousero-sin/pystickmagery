// ═══════════════════════════════════════════════════════════════════════════
// lightning.js — Lightning Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode, isEnemyEntity } from '../core/utils.js?v=8';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';
import {
    SPELL_DEFS as NEW_SPELL_DEFS,
    FIRE_HANDLERS as NEW_FIRE_HANDLERS,
    PROJ_HOOKS as NEW_PROJ_HOOKS,
    TRAIL_EMITTERS as NEW_TRAIL_EMITTERS,
    VFX_UPDATE as NEW_VFX_UPDATE,
    VFX_DRAW as NEW_VFX_DRAW,
} from './lightning-new.js?v=1';

// ── 4. LIGHTNING ──
const LEGACY_SPELL_DEFS = [
    { name: 'Lightning', icon: '⚡', key: '3', color: '#ffee33', c2: '#ffffaa', core: '#fff', speed: 0, dmg: 38, mana: 22, cd: 550, r: 2, grav: 0, drag: 1, bounce: 0, exR: 60, exF: 10, trail: 'electric', instant: true, desc: 'Instant strike at cursor — 38 dmg, AoE 60' },
    { name: 'Ball Lightning', icon: '🔵', key: 'P', color: '#aaddff', c2: '#ddeeff', core: '#ffffff', speed: 0, dmg: 14, mana: 28, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'electric', isBallLightning: true, ballDur: 220, ballR: 100, ballZapRate: 10, desc: 'Floating orb zaps nearby enemies (14 dmg/zap)' },
    { name: 'Tesla Coil', icon: '🗼', key: 'Q', color: '#ffdd44', c2: '#ffee88', core: '#ffffff', speed: 0, dmg: 18, mana: 35, cd: 1200, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'electric', isTeslaCoil: true, teslaDur: 280, teslaR: 140, teslaRate: 12, desc: 'Static coil arcs to nearby enemies (18 dmg/arc, x3 chain)' },
    { name: 'Thunder Mark', icon: '🎯', key: 'F', category: 'Mark', color: '#ffee44', c2: '#ffffaa', core: '#ffffff', speed: 0, dmg: 72, mana: 28, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'electric', isThunderMark: true, markR: 92, desc: 'Place a rune — recast to call devastation (72 dmg AoE)' },
    createHoldSpell({
        name: 'Faraday Snare', icon: '🪤', key: 'A',
        color: '#f1da48', c2: '#fff7a8', core: '#ffffff',
        mana: 20, cd: 980, dmg: 5,
        holdStyle: 'lightning', holdProfile: 'lightning_snare',
        holdR: 82, holdDrain: 0.26, holdForce: 0.12, holdDealsDamage: true,
        releaseR: 92, releaseDmg: 22,
        desc: 'Hold to charge a snare cage that pins targets in place with repeated arcs'
    }),
    createManifestSpell({
        name: 'Volt Conduit', icon: '🔌',
        color: '#f5dd42', c2: '#fff37a', core: '#ffffff',
        manifestStyle: 'lightning', manifestEffect: 'lightning_arc', manifestProfile: 'conduit', manifestGlyph: '!',
        manifestSolid: false, manifestDuration: 420,
        mana: 28, cd: 1000, manifestArc: 8, manifestThickness: 18, manifestSegmentHp: 14, manifestPulseDmg: 6, manifestBuildRate: 0.08,
        desc: 'Manifest a charged conduit that lashes nearby foes with arcing current'
    }),
    { name: 'Thunderbolt Cascade', icon: '🌩️', key: 'K', color: '#fff176', c2: '#ffffff', core: '#ffffff', speed: 0, dmg: 32, mana: 28, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'electric', isThunderboltCascade: true, cascadeR: 180, desc: '1→3→6 fractal lightning cascade — 32 → 24 → 16 dmg per wave' },
    { name: 'Magnetar Pulse', icon: '🧲', key: 'L', color: '#aaddff', c2: '#ddeeff', core: '#ffffff', speed: 0, dmg: 48, mana: 32, cd: 1100, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'electric', isMagnetar: true, magR: 150, magDur: 80, desc: 'Pulls then detonates — 48 dmg + shockwave knockback' },
    { name: 'Arc Pylon', icon: '🗼', key: 'R', category: 'Structure', color: '#ffee44', c2: '#ffff88', core: '#ffffff', speed: 0, dmg: 30, mana: 30, cd: 1200, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'electric', isArcPylon: true, pylonDur: 500, desc: 'Two-click: place pylons that crackle a deadly beam between them' },
    // ── NEW LIGHTNING SPELLS ──
    { name: 'Chain Lightning', icon: '🔗', key: 'C', color: '#fff176', c2: '#aaddff', core: '#ffffff', speed: 0, dmg: 34, mana: 26, cd: 700, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'electric', isChainLightning: true, chainMax: 5, chainR: 130, chainFalloff: 0.78, desc: 'Bolt arcs through up to 5 enemies, 34 dmg fading per jump' },
    { name: 'Plasma Lance', icon: '🪡', key: 'Y', color: '#aaddff', c2: '#ddeeff', core: '#ffffff', speed: 14, dmg: 26, mana: 24, cd: 650, r: 5, grav: 0, drag: 1, bounce: 0, trail: 'electric', isPlasmaLance: true, lanceDur: 36, pierceMax: 999, desc: 'Pierces every enemy in a straight searing beam line' },
    { name: 'Voltaic Aegis', icon: '🛡️', key: 'Z', category: 'Buff', color: '#ffee44', c2: '#fff176', core: '#ffffff', speed: 0, dmg: 14, mana: 32, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'electric', isVoltaicAegis: true, aegisDur: 360, aegisR: 70, aegisZapR: 110, aegisOrbs: 3, aegisZapRate: 14, desc: 'Three plasma orbs orbit you, zapping nearby foes for 6 seconds' },
    { name: 'Stormcaller', icon: '⛈️', key: 'T', color: '#aaddff', c2: '#ddeeff', core: '#ffffff', speed: 0, dmg: 52, mana: 90, cd: 9000, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'electric', isStormcaller: true, strikeCount: 22, desc: 'Ascend and summon a catastrophic lightning storm (Ultimate)' },
];

const REMOVED_SPELLS = new Set([
    'Lightning',
    'Ball Lightning',
    'Tesla Coil',
    'Thunder Mark',
    'Volt Conduit',
    'Thunderbolt Cascade',
    'Chain Lightning',
    'Voltaic Aegis',
]);

export const SPELL_DEFS = [
    ...LEGACY_SPELL_DEFS.filter((spell) => !REMOVED_SPELLS.has(spell.name)),
    ...NEW_SPELL_DEFS,
];

export const FIRE_HANDLERS = {
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    ...NEW_FIRE_HANDLERS,
    instant: (s, ox, oy, tx, ty) => {
        if (s.trail === 'electric') {
            createLightning(ox, oy, tx, ty, s);
            return true;
        }
        return false;
    },
    isBallLightning(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'ball_lightning', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playTone(400, 'sine', 0.2, 0.3);
        return true;
    },
    isTeslaCoil(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'tesla_coil', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playSweep(400, 800, 'sine', 0.3, 0.2);
        return true;
    },
    isThunderMark(s, ox, oy, tx, ty) {
        const existing = state.vfxSequences.find(v => v.type === 'thunder_mark' && v.state === 0);
        if (existing) {
            // Trigger the mark
            existing.state = 1;
            existing.age = 0;
            SoundFX.playSweep(200, 2000, 'sawtooth', 0.8, 0.4);
        } else {
            // Place mark
            state.vfxSequences.push({ type: 'thunder_mark', state: 0, age: 0, cx: tx, cy: ty, spell: s });
            SoundFX.playTone(800, 'sine', 0.2, 0.2);
            spawnP(tx, ty, s.color, 8, 'sparkle');
        }
        return true;
    },
    isThunderboltCascade(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'thunderbolt_cascade', state: 0, age: 0, tx, ty, ox, oy, spell: s });
        SoundFX.playSweep(200, 2400, 'sawtooth', 0.7, 0.3);
        return true;
    },
    isMagnetar(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'magnetar_pulse', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playTone(55, 'sine', 0.5, 0.6);
        return true;
    },
    isArcPylon(s, ox, oy, tx, ty) {
        const draft = state.vfxSequences.find(v => v.type === 'arc_pylon_draft');
        if (draft) {
            state.vfxSequences.splice(state.vfxSequences.indexOf(draft), 1);
            state.vfxSequences.push({ type: 'arc_pylon', state: 0, age: 0, x1: draft.x1, y1: draft.y1, x2: tx, y2: ty, spell: s });
            SoundFX.playSweep(400, 1200, 'sawtooth', 0.5, 0.3);
            spawnP(tx, ty, s.color, 8, 'sparkle');
        } else {
            state.vfxSequences.push({ type: 'arc_pylon_draft', x1: tx, y1: ty });
            SoundFX.playTone(600, 'sine', 0.2, 0.2);
            spawnP(tx, ty, s.color, 6, 'sparkle');
        }
        return true;
    },
    isStormcaller(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'stormcaller', state: 0, age: 0, spell: s });
        state.player.inv = true;
        SoundFX.playSweep(80, 400, 'sine', 0.6, 1.5);
        return true;
    },
    isChainLightning(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'chain_lightning', state: 0, age: 0, ox, oy, tx, ty, spell: s });
        SoundFX.playSweep(600, 1600, 'sawtooth', 0.55, 0.25);
        SoundFX.playNoise(0.4, 0.18, 800, 'highpass');
        return true;
    },
    isPlasmaLance(s, ox, oy, tx, ty) {
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const ang = Math.atan2(ty - py, tx - px);
        state.vfxSequences.push({
            type: 'plasma_lance', state: 0, age: 0,
            ox: px, oy: py, angle: ang,
            length: 460, spell: s, hitList: new Set(),
        });
        SoundFX.playSweep(900, 240, 'sawtooth', 0.55, 0.32);
        SoundFX.playNoise(0.45, 0.22, 600, 'highpass');
        state.shake(5);
        spawnP(px, py, s.core, 14, 'burst');
        return true;
    },
    isVoltaicAegis(s, ox, oy, tx, ty) {
        // Remove any existing aegis first
        for (let i = state.vfxSequences.length - 1; i >= 0; i--) {
            if (state.vfxSequences[i].type === 'voltaic_aegis') state.vfxSequences.splice(i, 1);
        }
        state.vfxSequences.push({
            type: 'voltaic_aegis', state: 0, age: 0,
            spell: s,
        });
        SoundFX.playSweep(400, 900, 'sine', 0.45, 0.35);
        return true;
    },
};

export const PROJ_HOOKS = { ...NEW_PROJ_HOOKS };
export const TRAIL_EMITTERS = { ...NEW_TRAIL_EMITTERS };
export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    ...NEW_VFX_UPDATE,
    thunder_mark(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Waiting — pulsing rune on ground
            if (v.age % 8 === 0) spawnP(v.cx + (Math.random()-.5)*20, v.cy + (Math.random()-.5)*20, s.color, 1, 'sparkle');
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 30 + Math.sin(v.age * 0.1) * 10, color: s.color, int: 0.6, life: 2, ml: 2 });
            // Auto-expire after 600 frames
            if (v.age > 600) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        } else if (v.state === 1) {
            // Triggered — massive lightning strike
            if (v.age === 1) {
                // Multiple lightning bolts from sky
                for (let b = 0; b < 5; b++) {
                    const offsetX = (Math.random() - .5) * 40;
                    const segs = [];
                    for (let i = 0; i <= 10; i++) {
                        const t = i / 10;
                        segs.push({
                            x: v.cx + offsetX + (i > 0 && i < 10 ? (Math.random() - .5) * 25 : 0),
                            y: (v.cy - 400) + 400 * t + (i > 0 && i < 10 ? (Math.random() - .5) * 20 : 0)
                        });
                    }
                    state.lightningBolts.push({ segments: segs, life: 15 + b * 3, color: b === 0 ? '#ffffff' : s.color, width: b === 0 ? 4 : 2 });
                }
                // Damage enemies in radius
                for (const e of state.entities) {
                    if (!isEnemyEntity(e)) continue;
                    const d = Math.hypot(e.x + e.w/2 - v.cx, e.y + e.h/2 - v.cy);
                    if (d < s.markR) {
                        hurtEntity(e, s.dmg, v.cx, v.cy);
                        e.vy -= 8;
                        spawnP(e.x + e.w/2, e.y + e.h/2, s.color, 10, 'burst');
                    }
                }
                explode(v.cx, v.cy, s.markR, 12, 0, s.color, s.c2);
                state.shake(18);
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 250, color: '#ffffff', int: 5, life: 10, ml: 10 });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.markR * 1.5, life: 12, maxLife: 12, color: s.color });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.markR, life: 8, maxLife: 8, color: '#ffffff' });
                SoundFX.playNoise(1.0, 0.5, 800, 'highpass');
            }
            if (v.age > 25) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    ball_lightning(v) {
        const s = v.spell;
        // Move toward nearest enemy
        let closest = null, minDist = s.ballR;
        for (const e of state.entities) {
            if (!isEnemyEntity(e)) continue;
            const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
            if (d < minDist) { minDist = d; closest = e; }
        }
        if (closest) {
            const dx = closest.x + closest.w / 2 - v.cx;
            const dy = closest.y + closest.h / 2 - v.cy;
            const d = Math.hypot(dx, dy);
            v.cx += dx / d * 1.5;
            v.cy += dy / d * 1.5;
        }
        // Zap nearby entities periodically
        if (v.age % s.ballZapRate === 0) {
            let target = null, minD = s.ballR;
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                if (d < minD) { minD = d; target = e; }
            }
            if (target) {
                hurtEntity(target, s.dmg, v.cx, v.cy);
                // Create mini lightning bolt
                const segs = [];
                for (let i = 0; i <= 5; i++) {
                    const t = i / 5;
                    segs.push({
                        x: v.cx + (target.x + target.w / 2 - v.cx) * t + (i > 0 && i < 5 ? (Math.random() - .5) * 15 : 0),
                        y: v.cy + (target.y + target.h / 2 - v.cy) * t + (i > 0 && i < 5 ? (Math.random() - .5) * 15 : 0)
                    });
                }
                state.lightningBolts.push({ segments: segs, life: 10, color: s.color, width: 2 });
                spawnP(target.x + target.w / 2, target.y + target.h / 2, s.color, 5, 'burst');
            }
        }
        spawnP(v.cx + (Math.random() - .5) * 20, v.cy + (Math.random() - .5) * 20, s.color, 1, 'sparkle');
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 40, color: s.color, int: 1.5, life: 3, ml: 3 });
        if (v.age > s.ballDur) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    tesla_coil(v) {
        const s = v.spell;
        if (v.age % s.teslaRate === 0) {
            // Find up to 2 closest entities
            const targets = [];
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                if (d < s.teslaR) targets.push({ entity: e, dist: d });
            }
            targets.sort((a, b) => a.dist - b.dist);
            for (let ti = 0; ti < Math.min(3, targets.length); ti++) {
                const target = targets[ti].entity;
                hurtEntity(target, s.dmg, v.cx, v.cy);
                // Create lightning bolt
                const segs = [];
                for (let i = 0; i <= 6; i++) {
                    const t = i / 6;
                    segs.push({
                        x: v.cx + (target.x + target.w / 2 - v.cx) * t + (i > 0 && i < 6 ? (Math.random() - .5) * 18 : 0),
                        y: v.cy + (target.y + target.h / 2 - v.cy) * t + (i > 0 && i < 6 ? (Math.random() - .5) * 18 : 0)
                    });
                }
                state.lightningBolts.push({ segments: segs, life: 12, color: s.color, width: 2.5 });
                spawnP(target.x + target.w / 2, target.y + target.h / 2, s.color, 6, 'burst');
            }
        }
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 50 + Math.sin(v.age * 0.2) * 10, color: s.color, int: 2, life: 2, ml: 2 });
        if (v.age > s.teslaDur) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    thunderbolt_cascade(v) {
        const s = v.spell;
        if (!v.wave1Done && v.age >= 1) {
            v.wave1Done = true;
            v.firstTargets = [];
            let best = null, bestD = s.cascadeR;
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const d = Math.hypot(e.x + e.w/2 - v.tx, e.y + e.h/2 - v.ty);
                if (d < bestD) { bestD = d; best = e; }
            }
            if (best) {
                const ex = best.x + best.w/2, ey = best.y + best.h/2;
                const segs = [];
                for (let i = 0; i <= 8; i++) {
                    const t = i/8;
                    segs.push({ x: v.tx+(ex-v.tx)*t+(i>0&&i<8?(Math.random()-.5)*22:0), y: v.ty+(ey-v.ty)*t+(i>0&&i<8?(Math.random()-.5)*22:0) });
                }
                state.lightningBolts.push({ segments: segs, life: 20, color: '#ffffff', width: 4 });
                hurtEntity(best, s.dmg, v.tx, v.ty);
                spawnP(ex, ey, s.color, 12, 'burst');
                state.dynamicLights.push({ x: ex, y: ey, r: 80, color: '#ffffff', int: 4, life: 8, ml: 8 });
                v.firstTargets.push({ x: ex, y: ey, e: best });
            } else {
                v.firstTargets.push({ x: v.tx, y: v.ty });
            }
            state.shake(8);
            SoundFX.playTone(1200, 'sawtooth', 0.5, 0.15);
        }
        if (!v.wave2Done && v.age >= 16) {
            v.wave2Done = true;
            v.secondTargets = [];
            const used = new Set(v.firstTargets.map(t => t.e).filter(Boolean));
            for (const src of v.firstTargets) {
                const candidates = [];
                for (const e of state.entities) {
                    if (!isEnemyEntity(e) || used.has(e)) continue;
                    const d = Math.hypot(e.x+e.w/2-src.x, e.y+e.h/2-src.y);
                    if (d < s.cascadeR * 0.8) candidates.push({ e, d });
                }
                candidates.sort((a, b) => a.d - b.d);
                for (let ci = 0; ci < Math.min(3, candidates.length); ci++) {
                    const { e } = candidates[ci];
                    used.add(e);
                    const ex = e.x+e.w/2, ey = e.y+e.h/2;
                    const segs = [];
                    for (let i = 0; i <= 6; i++) {
                        const t = i/6;
                        segs.push({ x: src.x+(ex-src.x)*t+(i>0&&i<6?(Math.random()-.5)*18:0), y: src.y+(ey-src.y)*t+(i>0&&i<6?(Math.random()-.5)*18:0) });
                    }
                    state.lightningBolts.push({ segments: segs, life: 18, color: s.color, width: 2.5 });
                    hurtEntity(e, s.dmg * 0.75, src.x, src.y);
                    spawnP(ex, ey, s.color, 8, 'burst');
                    state.dynamicLights.push({ x: ex, y: ey, r: 55, color: s.color, int: 3, life: 6, ml: 6 });
                    v.secondTargets.push({ x: ex, y: ey, e });
                }
            }
            state.shake(6);
            SoundFX.playSweep(600, 1800, 'sawtooth', 0.4, 0.2);
        }
        if (!v.wave3Done && v.age >= 32) {
            v.wave3Done = true;
            const used = new Set([...v.firstTargets.map(t=>t.e), ...(v.secondTargets||[]).map(t=>t.e)].filter(Boolean));
            const srcs = (v.secondTargets && v.secondTargets.length > 0) ? v.secondTargets : v.firstTargets;
            for (const src of srcs) {
                const candidates = [];
                for (const e of state.entities) {
                    if (!isEnemyEntity(e) || used.has(e)) continue;
                    const d = Math.hypot(e.x+e.w/2-src.x, e.y+e.h/2-src.y);
                    if (d < s.cascadeR) candidates.push({ e, d });
                }
                candidates.sort((a, b) => a.d - b.d);
                for (let ci = 0; ci < Math.min(6, candidates.length); ci++) {
                    const { e } = candidates[ci];
                    used.add(e);
                    const ex = e.x+e.w/2, ey = e.y+e.h/2;
                    const segs = [];
                    for (let i = 0; i <= 5; i++) {
                        const t = i/5;
                        segs.push({ x: src.x+(ex-src.x)*t+(i>0&&i<5?(Math.random()-.5)*14:0), y: src.y+(ey-src.y)*t+(i>0&&i<5?(Math.random()-.5)*14:0) });
                    }
                    state.lightningBolts.push({ segments: segs, life: 14, color: s.c2, width: 1.5 });
                    hurtEntity(e, s.dmg * 0.5, src.x, src.y);
                    spawnP(ex, ey, s.c2, 5, 'sparkle');
                }
            }
            state.shockwaves.push({ x: v.tx, y: v.ty, r: 0, maxR: s.cascadeR, life: 15, maxLife: 15, color: s.color });
            state.shake(5);
            SoundFX.playNoise(0.4, 0.3, 400, 'highpass');
        }
        if (v.age > 60) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    magnetar_pulse(v) {
        const s = v.spell;
        const pullDur = s.magDur;
        if (v.age < pullDur) {
            const t = v.age / pullDur;
            const strength = 0.8 + t * 2.5;
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const dx = v.cx - (e.x + e.w/2);
                const dy = v.cy - (e.y + e.h/2);
                const d = Math.hypot(dx, dy);
                if (d < s.magR && d > 1) {
                    e.vx += (dx/d) * strength * (1 - d/s.magR);
                    e.vy += (dy/d) * strength * (1 - d/s.magR);
                }
            }
            if (v.age % 4 === 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * s.magR;
                spawnP(v.cx + Math.cos(angle)*dist, v.cy + Math.sin(angle)*dist, '#aaddff', 1, 'sparkle');
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.magR * 0.5 * (1+t), color: '#aaddff', int: 1.5*t, life: 3, ml: 3 });
        } else if (!v.detonated) {
            v.detonated = true;
            state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.magR * 1.5, life: 20, maxLife: 20, color: '#ffffff' });
            state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.magR, life: 14, maxLife: 14, color: '#aaddff' });
            for (let i = 0; i < 8; i++) {
                const angle = (i/8) * Math.PI * 2;
                const tx2 = v.cx + Math.cos(angle) * s.magR;
                const ty2 = v.cy + Math.sin(angle) * s.magR;
                const segs = [];
                for (let j = 0; j <= 8; j++) {
                    const t2 = j/8;
                    segs.push({ x: v.cx+(tx2-v.cx)*t2+(j>0&&j<8?(Math.random()-.5)*20:0), y: v.cy+(ty2-v.cy)*t2+(j>0&&j<8?(Math.random()-.5)*20:0) });
                }
                state.lightningBolts.push({ segments: segs, life: 25, color: i%2===0?'#ffffff':'#aaddff', width: i%2===0?3:1.5 });
            }
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const d = Math.hypot(e.x+e.w/2-v.cx, e.y+e.h/2-v.cy);
                if (d < s.magR) {
                    hurtEntity(e, s.dmg, v.cx, v.cy);
                    const angle = Math.atan2(e.y+e.h/2-v.cy, e.x+e.w/2-v.cx);
                    e.vx += Math.cos(angle) * 15 * (1 - d/s.magR);
                    e.vy += Math.sin(angle) * 15 * (1 - d/s.magR);
                    spawnP(e.x+e.w/2, e.y+e.h/2, '#ffffff', 14, 'burst');
                }
            }
            explode(v.cx, v.cy, s.magR, 18, 0, '#aaddff', '#ffffff');
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 300, color: '#ffffff', int: 8, life: 12, ml: 12 });
            state.shake(25);
            SoundFX.playNoise(1.0, 0.6, 200, 'lowpass');
            SoundFX.playSweep(80, 1600, 'sawtooth', 0.8, 0.5);
            spawnP(v.cx, v.cy, '#ffffff', 30, 'explode');
        }
        if (v.age > pullDur + 40) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    arc_pylon_draft(v) {
        if (v.age > 300) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    arc_pylon(v) {
        const s = v.spell;
        if (v.age % 2 === 0) {
            v.beamSegs = [];
            const steps = 12;
            const topY1 = v.y1 - 40, topY2 = v.y2 - 40;
            for (let i = 0; i <= steps; i++) {
                const t = i/steps;
                v.beamSegs.push({
                    x: v.x1 + (v.x2-v.x1)*t + (i>0&&i<steps?(Math.random()-.5)*16:0),
                    y: topY1 + (topY2-topY1)*t + (i>0&&i<steps?(Math.random()-.5)*16:0)
                });
            }
        }
        if (v.age % 8 === 0) {
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const ex = e.x+e.w/2, ey = e.y+e.h/2;
                const dx = v.x2-v.x1, dy = v.y2-v.y1;
                const lenSq = dx*dx + dy*dy;
                let param = 0;
                if (lenSq > 0) param = Math.max(0, Math.min(1, ((ex-v.x1)*dx+(ey-v.y1)*dy)/lenSq));
                const nearX = v.x1+param*dx, nearY = v.y1+param*dy;
                if (Math.hypot(ex-nearX, ey-nearY) < 32) {
                    hurtEntity(e, Math.max(2, Math.floor(s.dmg * 0.14)), v.x1, v.y1);
                    spawnP(ex, ey, s.color, 3, 'sparkle');
                }
            }
        }
        const mx = (v.x1+v.x2)/2, my = (v.y1+v.y2)/2;
        state.dynamicLights.push({ x: mx, y: my-40, r: 55, color: s.color, int: 1.5, life: 2, ml: 2 });
        state.dynamicLights.push({ x: v.x1, y: v.y1-40, r: 30, color: s.c2, int: 2, life: 2, ml: 2 });
        state.dynamicLights.push({ x: v.x2, y: v.y2-40, r: 30, color: s.c2, int: 2, life: 2, ml: 2 });
        if (v.age > s.pylonDur) {
            spawnP(v.x1, v.y1, s.color, 10, 'burst');
            spawnP(v.x2, v.y2, s.color, 10, 'burst');
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    chain_lightning(v) {
        const s = v.spell;
        if (v.state === 0 && v.age >= 1) {
            v.state = 1;
            // Find first target near cursor
            let target = null, bestD = s.chainR;
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                const d = Math.hypot(e.x + e.w/2 - v.tx, e.y + e.h/2 - v.ty);
                if (d < bestD) { bestD = d; target = e; }
            }
            if (!target) {
                // No target — flash near cursor and exit
                state.lightningBolts.push({
                    segments: [
                        { x: v.ox, y: v.oy },
                        { x: (v.ox+v.tx)/2 + (Math.random()-.5)*20, y: (v.oy+v.ty)/2 + (Math.random()-.5)*20 },
                        { x: v.tx, y: v.ty },
                    ],
                    life: 14, color: s.color, width: 2,
                });
                state.dynamicLights.push({ x: v.tx, y: v.ty, r: 80, color: s.c2, int: 2.5, life: 8, ml: 8 });
                spawnP(v.tx, v.ty, s.c2, 8, 'sparkle');
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
                return;
            }
            // Build a chain through up to chainMax targets
            const used = new Set();
            used.add(target);
            const chain = [{ x: v.ox, y: v.oy, e: null }, { x: target.x + target.w/2, y: target.y + target.h/2, e: target }];
            let cur = target;
            for (let k = 1; k < s.chainMax; k++) {
                let next = null, nd = s.chainR;
                for (const e of state.entities) {
                    if (!isEnemyEntity(e) || used.has(e)) continue;
                    const d = Math.hypot(e.x+e.w/2 - (cur.x+cur.w/2), e.y+e.h/2 - (cur.y+cur.h/2));
                    if (d < nd) { nd = d; next = e; }
                }
                if (!next) break;
                used.add(next);
                chain.push({ x: next.x + next.w/2, y: next.y + next.h/2, e: next });
                cur = next;
            }
            // Apply damage with falloff + draw arcs
            let dmg = s.dmg;
            for (let i = 1; i < chain.length; i++) {
                const a = chain[i-1], b = chain[i];
                const segs = [];
                const steps = 8;
                for (let j = 0; j <= steps; j++) {
                    const t = j/steps;
                    segs.push({
                        x: a.x + (b.x-a.x)*t + (j>0&&j<steps?(Math.random()-.5)*22:0),
                        y: a.y + (b.y-a.y)*t + (j>0&&j<steps?(Math.random()-.5)*22:0),
                    });
                }
                state.lightningBolts.push({ segments: segs, life: 18, color: i===1?'#ffffff':s.color, width: i===1?3:2 });
                if (b.e) {
                    hurtEntity(b.e, Math.max(4, Math.floor(dmg)), a.x, a.y);
                    spawnP(b.x, b.y, s.color, 8 - i, 'burst');
                    state.dynamicLights.push({ x: b.x, y: b.y, r: 60, color: s.core, int: 2.5, life: 6, ml: 6 });
                }
                dmg *= s.chainFalloff;
            }
            state.shake(8);
            SoundFX.playTone(1200, 'sawtooth', 0.4, 0.18);
        }
        if (v.age > 30) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    plasma_lance(v) {
        const s = v.spell;
        const T = v.age / s.lanceDur;
        const grow = Math.min(1, v.age / 6);
        v.curLen = s.length * grow;
        // Hit detection along the line
        if (v.age % 2 === 0) {
            const endX = v.ox + Math.cos(v.angle) * v.curLen;
            const endY = v.oy + Math.sin(v.angle) * v.curLen;
            for (const e of state.entities) {
                if (!isEnemyEntity(e) || v.hitList.has(e)) continue;
                const ex = e.x + e.w/2, ey = e.y + e.h/2;
                // Distance from point to line segment
                const dxL = endX - v.ox, dyL = endY - v.oy;
                const lenSq = dxL*dxL + dyL*dyL;
                let param = 0;
                if (lenSq > 0) param = Math.max(0, Math.min(1, ((ex - v.ox)*dxL + (ey - v.oy)*dyL) / lenSq));
                const nearX = v.ox + param * dxL;
                const nearY = v.oy + param * dyL;
                if (Math.hypot(ex - nearX, ey - nearY) < 22) {
                    v.hitList.add(e);
                    hurtEntity(e, s.dmg, v.ox, v.oy);
                    e.vx += Math.cos(v.angle) * 4 / (e.mass || 1);
                    e.vy += Math.sin(v.angle) * 2 / (e.mass || 1) - 1.2;
                    spawnP(ex, ey, s.core, 10, 'burst');
                    spawnP(ex, ey, s.c2, 6, 'sparkle');
                }
            }
        }
        // Spark particles along the beam
        if (v.age % 2 === 0) {
            const sample = Math.random();
            const px = v.ox + Math.cos(v.angle) * v.curLen * sample;
            const py = v.oy + Math.sin(v.angle) * v.curLen * sample;
            state.particles.push({
                x: px + (Math.random()-.5)*4, y: py + (Math.random()-.5)*4,
                vx: (Math.random()-.5)*3, vy: (Math.random()-.5)*3,
                life: 12, ml: 12, color: Math.random()>.5 ? s.core : s.c2,
                size: 1.5 + Math.random()*1.5, grav: 0, type: 'sparkle',
            });
        }
        const midX = v.ox + Math.cos(v.angle) * v.curLen * 0.5;
        const midY = v.oy + Math.sin(v.angle) * v.curLen * 0.5;
        state.dynamicLights.push({ x: midX, y: midY, r: 100, color: s.core, int: 2.2 * (1 - T), life: 2, ml: 2 });
        if (v.age >= s.lanceDur) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    voltaic_aegis(v) {
        const s = v.spell;
        const player = state.player;
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        // Orb positions
        v.orbs = [];
        for (let i = 0; i < s.aegisOrbs; i++) {
            const a = (i / s.aegisOrbs) * Math.PI * 2 + v.age * 0.08;
            v.orbs.push({ x: cx + Math.cos(a) * s.aegisR, y: cy + Math.sin(a) * s.aegisR });
        }
        // Zap nearby enemies
        if (v.age % s.aegisZapRate === 0) {
            for (const orb of v.orbs) {
                let target = null, bestD = s.aegisZapR;
                for (const e of state.entities) {
                    if (!isEnemyEntity(e)) continue;
                    const d = Math.hypot(e.x + e.w/2 - orb.x, e.y + e.h/2 - orb.y);
                    if (d < bestD) { bestD = d; target = e; }
                }
                if (target) {
                    hurtEntity(target, s.dmg, orb.x, orb.y);
                    const ex = target.x + target.w/2, ey = target.y + target.h/2;
                    const segs = [];
                    for (let j = 0; j <= 5; j++) {
                        const t = j/5;
                        segs.push({
                            x: orb.x + (ex - orb.x)*t + (j>0&&j<5?(Math.random()-.5)*12:0),
                            y: orb.y + (ey - orb.y)*t + (j>0&&j<5?(Math.random()-.5)*12:0),
                        });
                    }
                    state.lightningBolts.push({ segments: segs, life: 9, color: s.color, width: 1.8 });
                    spawnP(ex, ey, s.color, 4, 'sparkle');
                }
            }
        }
        // Glow particles
        if (v.age % 4 === 0) {
            for (const orb of v.orbs) {
                state.particles.push({
                    x: orb.x + (Math.random()-.5)*5, y: orb.y + (Math.random()-.5)*5,
                    vx: (Math.random()-.5)*1, vy: (Math.random()-.5)*1,
                    life: 16, ml: 16, color: s.core,
                    size: 1.5, grav: 0, type: 'sparkle',
                });
            }
        }
        for (const orb of v.orbs) {
            state.dynamicLights.push({ x: orb.x, y: orb.y, r: 40, color: s.color, int: 1.4, life: 2, ml: 2 });
        }
        // Deflect / damage incoming enemy projectiles within aegisR
        if (state.enemyProjectiles && state.enemyProjectiles.length > 0) {
            for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
                const ep = state.enemyProjectiles[i];
                if (!ep) continue;
                const dx = ep.x - cx, dy = ep.y - cy;
                if (Math.hypot(dx, dy) < s.aegisR + 12) {
                    spawnP(ep.x, ep.y, s.color, 6, 'burst');
                    state.enemyProjectiles.splice(i, 1);
                }
            }
        }
        if (v.age >= s.aegisDur) {
            spawnP(cx, cy, s.core, 20, 'burst');
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    stormcaller(v) {
        const s = v.spell;
        if (v.strikesFired === undefined) { v.strikesFired = 0; v.nextStrike = 68; }
        if (v.age < 60) {
            state.player.vy = -4;
            if (v.age % 8 === 0) spawnP(state.player.x + state.player.w/2, state.player.y + state.player.h, '#aaddff', 3, 'sparkle');
            state.dynamicLights.push({ x: state.player.x + state.player.w/2, y: state.player.y + state.player.h/2, r: 60, color: '#aaddff', int: 1.5, life: 3, ml: 3 });
            if (v.age === 59) SoundFX.playSweep(80, 600, 'sine', 0.8, 2);
        } else if (v.age < 360) {
            if (v.strikesFired < s.strikeCount && v.age >= v.nextStrike) {
                v.strikesFired++;
                v.nextStrike += 8 + Math.floor(Math.random() * 12);
                let sx, sy;
                const aliveEnemies = state.entities.filter(isEnemyEntity);
                if (aliveEnemies.length > 0 && Math.random() < 0.75) {
                    const target = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)];
                    sx = target.x + target.w/2 + (Math.random()-.5)*20;
                    sy = target.y + target.h/2;
                    hurtEntity(target, s.dmg * 0.6, sx, sy);
                } else {
                    sx = 40 + Math.random() * (state.W - 80);
                    sy = state.H * 0.5 + Math.random() * state.H * 0.4;
                }
                const bsegs = [];
                for (let i = 0; i <= 10; i++) {
                    const t = i/10;
                    bsegs.push({ x: sx+(i>0&&i<10?(Math.random()-.5)*30:0), y: t*sy+(i>0&&i<10?(Math.random()-.5)*25:0) });
                }
                const isMega = v.strikesFired % 3 === 0;
                state.lightningBolts.push({ segments: bsegs, life: isMega?22:16, color: isMega?'#ffffff':s.color, width: isMega?5:2.5 });
                state.dynamicLights.push({ x: sx, y: sy, r: isMega?160:90, color: isMega?'#ffffff':s.color, int: isMega?6:3, life: 8, ml: 8 });
                spawnP(sx, sy, s.color, isMega?16:8, 'burst');
                if (isMega) {
                    state.shockwaves.push({ x: sx, y: sy, r: 0, maxR: 80, life: 12, maxLife: 12, color: s.color });
                    explode(sx, sy, 60, 8, 0, s.color, s.c2);
                    state.shake(14);
                    SoundFX.playNoise(0.8, 0.3, 200, 'highpass');
                } else {
                    state.shake(6);
                    SoundFX.playTone(600 + Math.random()*400, 'sawtooth', 0.3, 0.2);
                }
            }
            if (v.age % 3 === 0) {
                state.dynamicLights.push({ x: Math.random()*state.W, y: Math.random()*state.H*0.3, r: 40+Math.random()*60, color: '#aaddff', int: 0.4, life: 4, ml: 4 });
            }
        } else if (v.age === 360) {
            for (let i = 0; i < 6; i++) {
                const fx = 60 + i*(state.W-120)/5;
                const fsegs = [];
                for (let j = 0; j <= 12; j++) {
                    const t = j/12;
                    fsegs.push({ x: fx+(j>0&&j<12?(Math.random()-.5)*35:0), y: t*(state.H*0.85)+(j>0&&j<12?(Math.random()-.5)*30:0) });
                }
                state.lightningBolts.push({ segments: fsegs, life: 30, color: i%2===0?'#ffffff':'#fff176', width: i%2===0?6:3 });
            }
            for (const e of state.entities) {
                if (!isEnemyEntity(e)) continue;
                hurtEntity(e, s.dmg, e.x+e.w/2, e.y+e.h/2);
                spawnP(e.x+e.w/2, e.y+e.h/2, '#ffffff', 20, 'explode');
            }
            state.dynamicLights.push({ x: state.W/2, y: state.H/2, r: 600, color: '#ffffff', int: 10, life: 20, ml: 20 });
            state.shockwaves.push({ x: state.W/2, y: state.H/2, r: 0, maxR: state.W, life: 25, maxLife: 25, color: '#aaddff' });
            state.shake(35);
            SoundFX.playNoise(1.0, 1.5, 100, 'lowpass');
            SoundFX.playSweep(60, 1200, 'sawtooth', 1.0, 1.0);
        } else if (v.age > 360 && v.age < 420) {
            state.player.vy = 5;
            if (v.age === 380) state.player.inv = false;
        }
        if (v.age > 430) {
            state.player.inv = false;
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    }
};
export const VFX_DRAW = {
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    ...NEW_VFX_DRAW,
    thunder_mark(v, X) {
        const s = v.spell;
        if (v.state === 0) {
            // Glowing rune circle
            const pulse = 1 + Math.sin(v.age * 0.08) * 0.15;
            X.strokeStyle = s.color;
            X.lineWidth = 2;
            X.globalAlpha = 0.6 + Math.sin(v.age * 0.1) * 0.2;
            X.beginPath();
            X.arc(v.cx, v.cy, 20 * pulse, 0, Math.PI * 2);
            X.stroke();
            // Inner rotating rune
            X.save();
            X.translate(v.cx, v.cy);
            X.rotate(v.age * 0.02);
            X.strokeStyle = s.c2;
            X.lineWidth = 1.5;
            X.globalAlpha = 0.5;
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2;
                X.beginPath();
                X.moveTo(0, 0);
                X.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
                X.stroke();
            }
            // Lightning bolt symbol
            X.fillStyle = s.color;
            X.globalAlpha = 0.7;
            X.beginPath();
            X.moveTo(-4, -10); X.lineTo(2, -2); X.lineTo(-1, -2); X.lineTo(4, 10); X.lineTo(-2, 2); X.lineTo(1, 2);
            X.closePath();
            X.fill();
            X.restore();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Flash
            const flash = Math.max(0, 1 - v.age / 8);
            X.globalAlpha = flash * 0.7;
            X.fillStyle = '#ffffff';
            X.fillRect(0, 0, state.W, state.H);
            // Ground scorchmark
            X.globalAlpha = Math.max(0, 1 - v.age / 25) * 0.5;
            X.fillStyle = '#332200';
            X.beginPath();
            X.ellipse(v.cx, v.cy, s.markR * 0.6, s.markR * 0.2, 0, 0, Math.PI * 2);
            X.fill();
            X.globalAlpha = 1;
        }
    },
    ball_lightning(v, X) {
        const s = v.spell;
        // Glowing orb with electric arcs
        const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, 16);
        grad.addColorStop(0, s.core);
        grad.addColorStop(0.4, s.c2);
        grad.addColorStop(1, s.color);
        X.fillStyle = grad;
        X.globalAlpha = 0.9;
        X.beginPath();
        X.arc(v.cx, v.cy, 12, 0, Math.PI * 2);
        X.fill();
        // Electric arcs around orb
        X.strokeStyle = s.color;
        X.lineWidth = 1.5;
        X.globalAlpha = 0.7;
        for (let i = 0; i < 4; i++) {
            const startAngle = (i / 4) * Math.PI * 2 + v.age * 0.05;
            const a1 = startAngle;
            const a2 = startAngle + Math.PI * 0.3;
            X.beginPath();
            X.arc(v.cx, v.cy, 20, a1, a2);
            X.stroke();
        }
        // Orbiting sparks
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + v.age * 0.1;
            const sx = v.cx + Math.cos(angle) * 18;
            const sy = v.cy + Math.sin(angle) * 18;
            X.fillStyle = s.core;
            X.globalAlpha = 0.6;
            X.beginPath();
            X.arc(sx, sy, 2, 0, Math.PI * 2);
            X.fill();
        }
        X.globalAlpha = 1;
    },
    tesla_coil(v, X) {
        const s = v.spell;
        // Coil pillar
        X.fillStyle = '#ffdd44';
        X.globalAlpha = 0.7;
        X.fillRect(v.cx - 4, v.cy - 40, 8, 40);
        // Glowing top orb
        const grad = X.createRadialGradient(v.cx, v.cy - 40, 0, v.cx, v.cy - 40, 10);
        grad.addColorStop(0, s.core);
        grad.addColorStop(0.5, s.color);
        grad.addColorStop(1, 'transparent');
        X.fillStyle = grad;
        X.globalAlpha = 0.8;
        X.beginPath();
        X.arc(v.cx, v.cy - 40, 8, 0, Math.PI * 2);
        X.fill();
        // Electric arcs at top
        X.strokeStyle = s.color;
        X.lineWidth = 1.5;
        X.globalAlpha = 0.6 + Math.sin(v.age * 0.1) * 0.3;
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + v.age * 0.08;
            X.beginPath();
            X.moveTo(v.cx, v.cy - 40);
            X.lineTo(v.cx + Math.cos(angle) * 15, v.cy - 40 + Math.sin(angle) * 15);
            X.stroke();
        }
        X.globalAlpha = 1;
    },
    thunderbolt_cascade(v, X) {
        if (v.age < 12) {
            const a = 1 - v.age/12;
            X.globalAlpha = a * 0.9;
            X.strokeStyle = '#ffffff';
            X.lineWidth = 3;
            X.beginPath();
            X.arc(v.tx, v.ty, 18 + v.age*3, 0, Math.PI*2);
            X.stroke();
            X.strokeStyle = '#fff176';
            X.lineWidth = 1;
            X.globalAlpha = a * 0.5;
            X.beginPath();
            X.arc(v.tx, v.ty, 28 + v.age*3, 0, Math.PI*2);
            X.stroke();
            X.globalAlpha = 1;
        }
    },
    magnetar_pulse(v, X) {
        const s = v.spell;
        const pullDur = s.magDur;
        if (v.age < pullDur) {
            const t = v.age / pullDur;
            // Imploding rings
            for (let r = 0; r < 5; r++) {
                const ringT = ((t * 5 + r) % 1);
                const ringR = s.magR * (1 - ringT);
                X.globalAlpha = ringT * 0.45;
                X.strokeStyle = '#aaddff';
                X.lineWidth = 1.5;
                X.beginPath();
                X.arc(v.cx, v.cy, ringR, 0, Math.PI*2);
                X.stroke();
            }
            // Rotating field lines
            X.save();
            X.translate(v.cx, v.cy);
            X.rotate(v.age * 0.07);
            X.globalAlpha = 0.25;
            X.strokeStyle = '#ddeeff';
            X.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const a = (i/6)*Math.PI*2;
                X.beginPath();
                X.moveTo(Math.cos(a)*10, Math.sin(a)*10);
                X.lineTo(Math.cos(a)*s.magR*0.85, Math.sin(a)*s.magR*0.85);
                X.stroke();
            }
            X.restore();
            // Center glow
            const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, 24 + t*12);
            grad.addColorStop(0, 'rgba(255,255,255,0.7)');
            grad.addColorStop(0.5, 'rgba(170,221,255,0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            X.fillStyle = grad;
            X.globalAlpha = 0.8;
            X.beginPath();
            X.arc(v.cx, v.cy, 24 + t*12, 0, Math.PI*2);
            X.fill();
        } else if (v.detonated) {
            const elapsed = v.age - pullDur;
            const a = Math.max(0, 1 - elapsed/20);
            X.globalAlpha = a * 0.5;
            X.fillStyle = '#ffffff';
            X.fillRect(0, 0, state.W, state.H);
        }
        X.globalAlpha = 1;
    },
    arc_pylon_draft(v, X) {
        const pulse = 0.55 + Math.sin(v.age * 0.12) * 0.25;
        X.globalAlpha = pulse;
        X.fillStyle = '#ffee44';
        X.fillRect(v.x1 - 4, v.y1 - 38, 8, 38);
        const grad = X.createRadialGradient(v.x1, v.y1-38, 0, v.x1, v.y1-38, 12);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.6, '#ffee44');
        grad.addColorStop(1, 'transparent');
        X.fillStyle = grad;
        X.globalAlpha = pulse * 0.9;
        X.beginPath();
        X.arc(v.x1, v.y1-38, 10, 0, Math.PI*2);
        X.fill();
        X.globalAlpha = 0.35;
        X.strokeStyle = '#ffee44';
        X.lineWidth = 1;
        X.setLineDash([4, 5]);
        X.beginPath();
        X.arc(v.x1, v.y1, 18, 0, Math.PI*2);
        X.stroke();
        X.setLineDash([]);
        X.globalAlpha = 1;
    },
    arc_pylon(v, X) {
        const s = v.spell;
        const fadeAlpha = v.age > s.pylonDur - 40 ? Math.max(0, (s.pylonDur - v.age)/40) : 1;
        // Pylon pillars
        X.fillStyle = s.color;
        X.globalAlpha = 0.75 * fadeAlpha;
        X.fillRect(v.x1 - 4, v.y1 - 40, 8, 40);
        X.fillRect(v.x2 - 4, v.y2 - 40, 8, 40);
        // Glowing orbs on pylon tops
        for (const [px, py] of [[v.x1, v.y1-40], [v.x2, v.y2-40]]) {
            const g = X.createRadialGradient(px, py, 0, px, py, 14);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.5, s.color);
            g.addColorStop(1, 'transparent');
            X.fillStyle = g;
            X.globalAlpha = 0.95 * fadeAlpha;
            X.beginPath();
            X.arc(px, py, 12, 0, Math.PI*2);
            X.fill();
        }
        // Crackling beam
        if (v.beamSegs && v.beamSegs.length > 1) {
            X.globalAlpha = 0.85 * fadeAlpha;
            X.strokeStyle = '#ffffff';
            X.lineWidth = 3;
            X.shadowColor = s.color;
            X.shadowBlur = 8;
            X.beginPath();
            X.moveTo(v.beamSegs[0].x, v.beamSegs[0].y);
            for (let i = 1; i < v.beamSegs.length; i++) X.lineTo(v.beamSegs[i].x, v.beamSegs[i].y);
            X.stroke();
            X.strokeStyle = s.color;
            X.lineWidth = 1.5;
            X.globalAlpha = 0.6 * fadeAlpha;
            X.beginPath();
            X.moveTo(v.beamSegs[0].x, v.beamSegs[0].y);
            for (let i = 1; i < v.beamSegs.length; i++) X.lineTo(v.beamSegs[i].x, v.beamSegs[i].y);
            X.stroke();
            X.shadowBlur = 0;
        }
        X.globalAlpha = 1;
    },
    chain_lightning(v, X) {
        // Bolts handle their own draw via state.lightningBolts — this draw adds a brief origin flash
        const s = v.spell;
        if (v.age < 8) {
            const a = 1 - v.age / 8;
            X.globalAlpha = a * 0.7;
            X.strokeStyle = s.core;
            X.lineWidth = 2;
            X.beginPath();
            X.arc(v.ox, v.oy, 12 + v.age * 2, 0, Math.PI * 2);
            X.stroke();
            X.globalAlpha = 1;
        }
    },
    plasma_lance(v, X) {
        const s = v.spell;
        const T = v.age / s.lanceDur;
        const fade = 1 - T;
        if (!v.curLen) return;
        const endX = v.ox + Math.cos(v.angle) * v.curLen;
        const endY = v.oy + Math.sin(v.angle) * v.curLen;
        X.save();
        X.globalCompositeOperation = 'lighter';
        // Outer glow halo
        X.strokeStyle = s.c2;
        X.lineWidth = 14;
        X.globalAlpha = 0.28 * fade;
        X.shadowColor = s.core;
        X.shadowBlur = 16;
        X.beginPath();
        X.moveTo(v.ox, v.oy);
        X.lineTo(endX, endY);
        X.stroke();
        // Mid beam
        X.strokeStyle = s.color;
        X.lineWidth = 6;
        X.globalAlpha = 0.6 * fade;
        X.shadowBlur = 10;
        X.beginPath();
        X.moveTo(v.ox, v.oy);
        X.lineTo(endX, endY);
        X.stroke();
        // Core beam
        X.strokeStyle = '#ffffff';
        X.lineWidth = 2.4;
        X.globalAlpha = 0.95 * fade;
        X.shadowBlur = 6;
        X.beginPath();
        X.moveTo(v.ox, v.oy);
        X.lineTo(endX, endY);
        X.stroke();
        X.shadowBlur = 0;
        // Jagged static along beam
        X.strokeStyle = s.core;
        X.lineWidth = 1.2;
        X.globalAlpha = 0.8 * fade;
        X.beginPath();
        const segs = 14;
        X.moveTo(v.ox, v.oy);
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            const bx = v.ox + (endX - v.ox) * t + (Math.random() - 0.5) * 8;
            const by = v.oy + (endY - v.oy) * t + (Math.random() - 0.5) * 8;
            X.lineTo(bx, by);
        }
        X.lineTo(endX, endY);
        X.stroke();
        X.restore();
        // Impact bloom at tip
        const g = X.createRadialGradient(endX, endY, 0, endX, endY, 22);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, s.core);
        g.addColorStop(1, 'transparent');
        X.fillStyle = g;
        X.globalAlpha = 0.85 * fade;
        X.beginPath();
        X.arc(endX, endY, 22, 0, Math.PI * 2);
        X.fill();
        X.globalAlpha = 1;
    },
    voltaic_aegis(v, X) {
        const s = v.spell;
        if (!v.orbs || v.orbs.length === 0) return;
        const fade = v.age > s.aegisDur - 40 ? Math.max(0, (s.aegisDur - v.age) / 40) : 1;
        X.save();
        X.globalCompositeOperation = 'lighter';
        for (const orb of v.orbs) {
            const g = X.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 14);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.4, s.core);
            g.addColorStop(0.85, s.color);
            g.addColorStop(1, 'transparent');
            X.fillStyle = g;
            X.globalAlpha = 0.9 * fade;
            X.beginPath();
            X.arc(orb.x, orb.y, 12, 0, Math.PI * 2);
            X.fill();
            // Static crackle around orb
            X.strokeStyle = s.color;
            X.lineWidth = 1.2;
            X.globalAlpha = 0.55 * fade;
            for (let i = 0; i < 3; i++) {
                const a1 = (v.age * 0.15 + i * Math.PI * 2 / 3);
                const a2 = a1 + 0.6;
                X.beginPath();
                X.arc(orb.x, orb.y, 16, a1, a2);
                X.stroke();
            }
        }
        X.restore();
        // Faint ring around player showing radius
        const player = state.player;
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        X.strokeStyle = s.c2;
        X.lineWidth = 1;
        X.globalAlpha = 0.18 * fade;
        X.setLineDash([4, 5]);
        X.beginPath();
        X.arc(cx, cy, s.aegisR, 0, Math.PI * 2);
        X.stroke();
        X.setLineDash([]);
        X.globalAlpha = 1;
    },
    stormcaller(v, X) {
        if (v.age < 60) {
            // Ascend: electric column under player
            const a = v.age/60;
            const grad = X.createLinearGradient(0, state.player.y + state.player.h, 0, state.H);
            grad.addColorStop(0, `rgba(170,221,255,${0.4*a})`);
            grad.addColorStop(1, 'rgba(170,221,255,0)');
            X.fillStyle = grad;
            X.globalAlpha = 1;
            X.fillRect(state.player.x - 6, state.player.y + state.player.h, state.player.w + 12, state.H - state.player.y - state.player.h);
        } else if (v.age < 360) {
            // Storm vignette — dark stormclouds at top
            const t = Math.min(1, (v.age-60)/80);
            const grad = X.createLinearGradient(0, 0, 0, state.H * 0.55);
            grad.addColorStop(0, `rgba(8,15,30,${t * 0.45})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            X.fillStyle = grad;
            X.globalAlpha = 1;
            X.fillRect(0, 0, state.W, state.H);
            // Strike counter HUD
            if (v.strikesFired !== undefined) {
                X.globalAlpha = 0.7;
                X.fillStyle = '#aaddff';
                X.font = 'bold 11px monospace';
                X.textAlign = 'center';
                X.fillText(`⚡ ${v.strikesFired}/${v.spell.strikeCount}`, state.player.x + state.player.w/2, state.player.y - 18);
                X.textAlign = 'left';
                X.globalAlpha = 1;
            }
        } else if (v.age < 420) {
            // Finale flash
            const a = Math.max(0, 1 - (v.age-360)/35);
            X.globalAlpha = a * 0.75;
            X.fillStyle = '#ffffff';
            X.fillRect(0, 0, state.W, state.H);
            X.globalAlpha = 1;
        }
    }
};

// We migrate lightningBolts tracking to the global state to decouple it
if (!state.lightningBolts) state.lightningBolts = [];

export function createLightning(x1, y1, x2, y2, sp) {
    if (sp.name.includes('Frost')) SoundFX.playSweep(2000, 4000, 'triangle', 0.15, 0.2);
    else if (sp.name.includes('Arcane')) SoundFX.playSweep(800, 1200, 'square', 0.15, 0.15);
    else SoundFX.playTone(800 + Math.random() * 400, 'sawtooth', 0.1, 0.3); // Electric zap

    const segs = [], steps = 14;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        segs.push({
            x: x1 + (x2 - x1) * t + (i > 0 && i < steps ? (Math.random() - .5) * 35 : 0),
            y: y1 + (y2 - y1) * t + (i > 0 && i < steps ? (Math.random() - .5) * 35 : 0)
        });
    }
    state.lightningBolts.push({ segments: segs, life: 18, color: sp.color, width: 3 });
    for (let b = 0; b < 4; b++) {
        const si = 3 + Math.floor(Math.random() * (steps - 4)), bs = [], base = segs[si], len = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j <= len; j++)
            bs.push({ x: base.x + (Math.random() - .5) * 22 * j, y: base.y + (Math.random() - .5) * 22 * j + j * 5 });
        state.lightningBolts.push({ segments: bs, life: 14, color: '#aaddff', width: 1 });
    }
    explode(x2, y2, sp.exR, sp.exF, sp.dmg, sp.color, sp.c2);
    state.dynamicLights.push({ x: x2, y: y2, r: 120, color: '#ffee88', int: 2, life: 12, ml: 12 });
    state.shake(9);
}
