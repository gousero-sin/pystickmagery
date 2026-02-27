// ═══════════════════════════════════════════════════════════════════════════
// lightning.js — Lightning Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

// ── 4. LIGHTNING ──
export const SPELL_DEFS = [
    { name: 'Lightning', icon: '⚡', key: '3', color: '#ffee33', c2: '#ffffaa', core: '#fff', speed: 0, dmg: 30, mana: 22, cd: 600, r: 2, grav: 0, drag: 1, bounce: 0, exR: 55, exF: 8, trail: 'electric', instant: true, desc: 'Instant strike at cursor' },
    createManifestSpell({
        name: 'Volt Conduit', icon: '🔌',
        color: '#f5dd42', c2: '#fff37a', core: '#ffffff',
        manifestStyle: 'lightning', manifestEffect: 'lightning_arc', manifestProfile: 'conduit', manifestGlyph: '!',
        manifestSolid: false, manifestDuration: 420,
        mana: 28, cd: 1000, manifestArc: 8, manifestThickness: 18, manifestSegmentHp: 14, manifestPulseDmg: 6, manifestBuildRate: 0.08,
        desc: 'Manifest a charged conduit that lashes nearby foes with arcing current'
    })
];

export const FIRE_HANDLERS = {
    ...MANIFEST_FIRE_HANDLERS,
    instant: (s, ox, oy, tx, ty) => {
        if (s.trail === 'electric') {
            createLightning(ox, oy, tx, ty, s);
            return true;
        }
        return false;
    }
};

export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};
export const VFX_UPDATE = {
    ...MANIFEST_VFX_UPDATE
};
export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW
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
