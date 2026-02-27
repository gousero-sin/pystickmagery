// ═══════════════════════════════════════════════════════════════════════════
// arcane.js — Arcane & Tech Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

export const SPELL_DEFS = [
    { name: 'Arcane Missile', icon: '🔮', key: '4', color: '#bb55ff', c2: '#dd88ff', core: '#eeddff', speed: 5, dmg: 12, mana: 10, cd: 180, r: 4, grav: 0, drag: .999, bounce: 0, exR: 18, exF: 3, trail: 'arcane', homing: true, homeStr: .15, desc: 'Homing to nearest target' },
    { name: 'Ricochet', icon: '🔷', key: 'Y', color: '#44aaff', c2: '#66ccff', core: '#bbddff', speed: 10, dmg: 14, mana: 12, cd: 250, r: 3, grav: .02, drag: 1, bounce: 8, exR: 0, exF: 0, trail: 'ricochet', desc: 'Bounces 8 times off surfaces' },
    { name: 'Plasma Orb', icon: '🟣', key: '[', color: '#dd33ff', c2: '#ee77ff', core: '#ffaaff', speed: 2.5, dmg: 8, mana: 30, cd: 800, r: 4, grav: 0, drag: .999, bounce: 0, trail: 'plasma', isPlasma: true, plasmaGrow: .04, plasmaMax: 18, desc: 'Grows in size and damage' },
    { name: 'Nova', icon: '💥', key: 'Q', color: '#ff44aa', c2: '#ff88cc', core: '#ffddee', speed: 8, dmg: 15, mana: 28, cd: 600, r: 3, grav: 0, drag: .995, bounce: 0, exR: 15, exF: 3, trail: 'nova', isNova: true, novaCount: 12, desc: '360° ring of projectiles' },
    { name: 'Laser Beam', icon: '📡', key: 'Z', color: '#ff2222', c2: '#ff6644', core: '#ffaaaa', speed: 0, dmg: 2, mana: 1, cd: 30, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'laser', isLaser: true, laserW: 3, desc: 'Continuous beam — hold click' },
    createManifestSpell({
        name: 'Sigil Lattice', icon: '🔳',
        color: '#c36aff', c2: '#f2a3ff', core: '#fff0ff',
        manifestStyle: 'arcane', manifestEffect: 'arcane_focus', manifestProfile: 'panels', manifestGlyph: '#',
        manifestDuration: 840,
        mana: 24, cd: 900, manifestArc: 16, manifestThickness: 10, manifestSegmentHp: 28,
        desc: 'Manifest floating sigil panels that stabilize and restore arcane focus'
    })
];

export const FIRE_HANDLERS = {
    ...MANIFEST_FIRE_HANDLERS,
    isNova: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'nova', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, spell: s });
        return true;
    },
    isLaser: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'laser', state: 0, age: 0, tx, ty, spell: s });
        return true;
    }
};

export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};
export const VFX_UPDATE = {
    ...MANIFEST_VFX_UPDATE,
    'nova': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            state.player.castAnim = 280; state.player.castType = 'burst';
            if (v.age === 1) {
                SoundFX.playSweep(400, 800, 'square', 0.5, 0.2);
                state.shake(6);
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 150, color: s.color, int: 2, life: 5, ml: 5 });
                const count = s.novaCount || 8;
                for (let k = 0; k < count; k++) {
                    const angle = (k / count) * Math.PI * 2;
                    state.projectiles.push({ x: v.cx + Math.cos(angle) * 20, y: v.cy + Math.sin(angle) * 20, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed, spell: s, life: 200, age: 0, trail: [], hitList: [], bounces: 0, chains: 0, growR: s.r, growDmg: s.dmg });
                }
            }
            if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - .5) * 40, v.cy + (Math.random() - .5) * 40, s.color, 2, 'sparkle');
            if (v.age > 10) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'laser': (v) => {
        const s = v.spell;
        if (v.state === 0) { // Charge up
            const px = state.player.x + state.player.w / 2 + state.player.facing * 10, py = state.player.y + 8;
            if (v.age % 2 === 0) spawnP(px + (Math.random() - .5) * 15, py + (Math.random() - .5) * 15, s.color, 1, 'void');
            state.dynamicLights.push({ x: px, y: py, r: 30, color: s.color, int: v.age / 6, life: 2, ml: 2 });
            state.player.castAnim = 280; state.player.sq = 1.2; state.player.st = 1 / state.player.sq; state.player.castType = 'channel';
            if (v.age > 4) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) { // Fire
            if (v.age % 5 === 0) SoundFX.playTone(800 + Math.random() * 200, 'sawtooth', 0.1, 0.1);
            const ox = state.player.x + state.player.w / 2 + state.player.facing * 10, oy = state.player.y + 8;
            const angle = Math.atan2(state.mouse.y - oy, state.mouse.x - ox);
            let hx = ox, hy = oy; const step = 4, maxDist = 400;
            for (let d = 0; d < maxDist; d += step) {
                hx = ox + Math.cos(angle) * d; hy = oy + Math.sin(angle) * d;
                let hitP = false;
                for (const p of state.platforms) {
                    if (hx > p.x && hx < p.x + p.w && hy > p.y && hy < p.y + p.h) { hitP = true; break; }
                }
                if (hitP || hx < 0 || hx > 1200 || hy < 0 || hy > 800) break; // Hardcoded W and H
            }
            const maxD = Math.hypot(hx - ox, hy - oy);
            // Hurt entities along beam
            for (const e of state.entities) {
                if (!e.active) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                // Project point on line segment
                const l1 = (ex - ox) * Math.cos(angle) + (ey - oy) * Math.sin(angle);
                if (l1 > 0 && l1 < maxD) {
                    const px1 = ox + Math.cos(angle) * l1, py1 = oy + Math.sin(angle) * l1;
                    if (Math.hypot(ex - px1, ey - py1) < 15) {
                        if (v.age % 5 === 0) hurtEntity(e, s.dmg, hx, hy);
                        const ka = Math.atan2(e.y + e.h / 2 - hy, e.x + e.w / 2 - hx); e.vx += Math.cos(ka) * .1; e.vy += Math.sin(ka) * .1;
                        spawnP(ex, ey, s.color, 1, 'burst');
                    }
                }
            }
            v.hx = hx; v.hy = hy; v.ox = ox; v.oy = oy;
            if (v.age % 2 === 0) spawnP(hx, hy, s.color, 1, 'burst');
            state.dynamicLights.push({ x: hx, y: hy, r: 60, color: s.color, int: 2, life: 2, ml: 2 });
            state.shake(1);
            if (!state.mouse.down || state.player.mana < 2) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
            else { state.player.mana -= 0.25; state.player.castAnim = 280; state.player.sq = 1.2; state.player.st = 1 / state.player.sq; state.player.castType = 'channel'; }
        }
    }
};
export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW,
    'laser': (v, X) => {
        if (v.state === 1) {
            const steps = 8; const segs = [];
            for (let j = 0; j <= steps; j++) {
                segs.push({
                    x: v.ox + (v.hx - v.ox) * (j / steps) + (j > 0 && j < steps ? (Math.random() - .5) * 8 : 0),
                    y: v.oy + (v.hy - v.oy) * (j / steps) + (j > 0 && j < steps ? (Math.random() - .5) * 8 : 0)
                });
            }
            X.strokeStyle = v.spell.color; X.lineWidth = v.spell.laserW + 4; X.globalAlpha = 0.3;
            X.beginPath(); segs.forEach((s2, idx) => idx === 0 ? X.moveTo(s2.x, s2.y) : X.lineTo(s2.x, s2.y)); X.stroke();
            X.strokeStyle = '#fff'; X.lineWidth = v.spell.laserW; X.globalAlpha = 0.8;
            X.beginPath(); segs.forEach((s2, idx) => idx === 0 ? X.moveTo(s2.x, s2.y) : X.lineTo(s2.x, s2.y)); X.stroke();
            X.globalAlpha = 1;
        }
    }
};
