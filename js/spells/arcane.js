// ═══════════════════════════════════════════════════════════════════════════
// arcane.js — Arcane & Tech Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';

export const SPELL_DEFS = [
    { name: 'Arcane Missile', icon: '🔮', key: '4', color: '#bb55ff', c2: '#dd88ff', core: '#eeddff', speed: 5, dmg: 12, mana: 10, cd: 180, r: 4, grav: 0, drag: .999, bounce: 0, exR: 18, exF: 3, trail: 'arcane', homing: true, homeStr: .15, desc: 'Homing to nearest target' },
    { name: 'Ricochet', icon: '🔷', key: 'Y', color: '#44aaff', c2: '#66ccff', core: '#bbddff', speed: 10, dmg: 14, mana: 12, cd: 250, r: 3, grav: .02, drag: 1, bounce: 8, exR: 0, exF: 0, trail: 'ricochet', desc: 'Bounces 8 times off surfaces' },
    { name: 'Plasma Orb', icon: '🟣', key: '[', color: '#dd33ff', c2: '#ee77ff', core: '#ffaaff', speed: 2.5, dmg: 8, mana: 30, cd: 800, r: 4, grav: 0, drag: .999, bounce: 0, trail: 'plasma', isPlasma: true, plasmaGrow: .04, plasmaMax: 18, desc: 'Grows in size and damage' },
    { name: 'Nova', icon: '💥', key: 'Q', color: '#ff44aa', c2: '#ff88cc', core: '#ffddee', speed: 8, dmg: 15, mana: 28, cd: 600, r: 3, grav: 0, drag: .995, bounce: 0, exR: 15, exF: 3, trail: 'nova', isNova: true, novaCount: 12, desc: '360° ring of projectiles' },
    { name: 'Laser Beam', icon: '📡', key: 'Z', color: '#ff2222', c2: '#ff6644', core: '#ffaaaa', speed: 0, dmg: 2, mana: 1, cd: 30, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'laser', isLaser: true, laserW: 3, desc: 'Continuous beam — hold click' },
    { name: 'Mirror Image', icon: '👥', key: 'F', color: '#bb66ff', c2: '#dd99ff', core: '#eeccff', speed: 0, dmg: 20, mana: 25, cd: 1000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'arcane', isMirrorImage: true, cloneCount: 3, cloneDur: 240, desc: 'Illusory clones that explode on contact' },
    { name: 'Mana Drain', icon: '💜', key: 'G', color: '#9944dd', c2: '#bb77ff', core: '#ddaaff', speed: 5, dmg: 15, mana: 12, cd: 450, r: 4, grav: 0, drag: .999, bounce: 0, exR: 20, exF: 3, trail: 'arcane', homing: true, homeStr: .12, isManaDrain: true, manaRestore: 9, desc: 'Restores mana on hit' },
    { name: 'Spell Parry', icon: '🛡️', key: 'F', category: 'Riposte', color: '#bb66ff', c2: '#dd99ff', core: '#eeddff', speed: 0, dmg: 30, mana: 18, cd: 600, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'arcane', isSpellParry: true, parryWindow: 30, parryR: 45, desc: 'Brief parry — reflects next attack' },
    createHoldSpell({
        name: 'Vector Frame', icon: '🟪', key: 'A',
        color: '#b76aff', c2: '#efb2ff', core: '#ffffff',
        mana: 20, cd: 960, dmg: 0,
        holdStyle: 'arcane', holdProfile: 'arcane_frame',
        holdR: 74, holdDrain: 0.24,
        releaseR: 78, releaseDmg: 0,
        desc: 'Hold to freeze projectiles in a programmable frame and fire them back on release'
    }),
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
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    isSpellParry(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'spell_parry', state: 0, age: 0, spell: s, parried: false });
        SoundFX.playTone(1000, 'sine', 0.25, 0.1);
        state.player.castAnim = 280;
        state.player.castType = 'front_pose';
        state.player.staffGlow = 280;
        return true;
    },
    isNova: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'nova', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, spell: s });
        return true;
    },
    isLaser: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'laser', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isMirrorImage: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'mirror_image', state: 0, age: 0, spell: s });
        spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, s.color, 8, 'sparkle');
        return true;
    }
};

export const PROJ_HOOKS = {
    'arcane': {
        onLand: (p, s, hitPlat, hitEntity) => {
            if (s.isManaDrain && hitEntity) {
                state.player.mana = Math.min(state.player.maxMana, state.player.mana + s.manaRestore);
                spawnP(p.x, p.y, '#dd99ff', 6, 'sparkle');
                SoundFX.playTone(600, 'sine', 0.3, 0.15);
            }
        }
    }
};
export const TRAIL_EMITTERS = {};
export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    'spell_parry': (v) => {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        if (v.state === 0) {
            // Active parry window — check for enemy projectiles
            for (let i = state.projectiles.length - 1; i >= 0; i--) {
                const p = state.projectiles[i];
                if (p.subProj || !p.spell) continue;
                // Check if it's an enemy projectile (no hitList or coming toward player)
                const dx = p.x - px, dy = p.y - py;
                if (Math.hypot(dx, dy) < s.parryR) {
                    // Reflect it
                    p.vx = -p.vx * 1.5;
                    p.vy = -p.vy * 1.5;
                    p.hitList = [];
                    v.parried = true;
                    v.state = 1;
                    v.age = 0;
                    SoundFX.playSweep(1200, 2400, 'square', 0.3, 0.15);
                    state.shake(6);
                    spawnP(p.x, p.y, s.color, 12, 'burst');
                    state.dynamicLights.push({ x: p.x, y: p.y, r: 80, color: s.core, int: 3, life: 6, ml: 6 });
                    state.shockwaves.push({ x: px, y: py, r: 0, maxR: s.parryR, life: 6, maxLife: 6, color: s.color });
                    break;
                }
            }
            // Also check entity attacks (enemies close and attacking)
            if (!v.parried) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const d = Math.hypot(e.x + e.w/2 - px, e.y + e.h/2 - py);
                    if (d < s.parryR + 15) {
                        // Counter-attack
                        hurtEntity(e, s.dmg, px, py);
                        e.vx += (e.x + e.w/2 - px) / d * 15;
                        e.vy -= 5;
                        v.parried = true;
                        v.state = 1;
                        v.age = 0;
                        SoundFX.playSweep(800, 1600, 'triangle', 0.4, 0.2);
                        state.shake(8);
                        spawnP(e.x + e.w/2, e.y + e.h/2, s.core, 15, 'burst');
                        state.dynamicLights.push({ x: px, y: py, r: 100, color: s.core, int: 4, life: 8, ml: 8 });
                        state.shockwaves.push({ x: px, y: py, r: 0, maxR: 60, life: 8, maxLife: 8, color: '#ffffff' });
                        break;
                    }
                }
            }
            // Parry window expired without parry
            if (v.age > s.parryWindow && !v.parried) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        } else if (v.state === 1) {
            // Post-parry flash
            if (v.age > 12) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'mirror_image': (v) => {
        const s = v.spell;
        if (v.state === 0 && v.age === 1) {
            // Create clones at spread positions
            v.clones = [];
            const baseX = state.player.x + state.player.w / 2;
            const baseY = state.player.y + state.player.h / 2;
            v.clones.push({ x: baseX - 35, y: baseY, hp: 1, alive: true });
            v.clones.push({ x: baseX + 35, y: baseY, hp: 1, alive: true });
            v.clones.push({ x: baseX, y: baseY - 35, hp: 1, alive: true });
        }
        if (v.state === 0 && v.clones) {
            // Bob clones slightly
            const bob = Math.sin(v.age * 0.1) * 3;
            for (const clone of v.clones) clone.y += bob * 0.1;

            // Check for nearby entities
            if (v.age % 8 === 0) {
                for (const clone of v.clones) {
                    if (!clone.alive) continue;
                    for (const e of state.entities) {
                        if (!e.active) continue;
                        const dist = Math.hypot(e.x + e.w / 2 - clone.x, e.y + e.h / 2 - clone.y);
                        if (dist < 30) {
                            spawnP(clone.x, clone.y, s.color, 8, 'burst');
                            clone.alive = false;
                        }
                    }
                }
            }

            // Remove dead clones
            v.clones = v.clones.filter(c => c.alive);

            // Timeout or all dead
            if (v.clones.length === 0 || v.age > s.cloneDur) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
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
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    'spell_parry': (v, X) => {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        if (v.state === 0) {
            // Arcane shield in front of player
            const facing = state.player.facing || 1;
            const shieldX = px + facing * 18;
            const progress = v.age / s.parryWindow;
            X.save();
            X.translate(shieldX, py);
            X.rotate(facing > 0 ? 0 : Math.PI);
            // Shield arc
            const grad = X.createRadialGradient(0, 0, 5, 0, 0, 25);
            grad.addColorStop(0, s.core + '88');
            grad.addColorStop(0.5, s.color + '66');
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.8 * (1 - progress);
            X.beginPath();
            X.arc(0, 0, 22, -Math.PI * 0.6, Math.PI * 0.6);
            X.lineTo(0, 0);
            X.fill();
            // Edge glow
            X.strokeStyle = s.core;
            X.lineWidth = 2;
            X.globalAlpha = 0.9 * (1 - progress);
            X.beginPath();
            X.arc(0, 0, 22, -Math.PI * 0.6, Math.PI * 0.6);
            X.stroke();
            X.restore();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Parry flash
            X.globalAlpha = Math.max(0, 1 - v.age / 8) * 0.4;
            X.fillStyle = s.core;
            X.fillRect(0, 0, state.W, state.H);
            X.globalAlpha = 1;
        }
    },
    'mirror_image': (v, X) => {
        if (v.clones) {
            const flicker = Math.random() > 0.5 ? 0.4 : 0.7;
            for (const clone of v.clones) {
                if (!clone.alive) continue;
                // Draw purple silhouette (simplified stick figure)
                X.globalAlpha = flicker;
                X.fillStyle = v.spell.color;
                X.beginPath();
                X.arc(clone.x, clone.y - 6, 4, 0, Math.PI * 2);
                X.fill();
                X.fillRect(clone.x - 3, clone.y - 2, 6, 8);
                X.fillRect(clone.x - 6, clone.y, 3, 6);
                X.fillRect(clone.x + 3, clone.y, 3, 6);
                // Arcane glow underneath
                X.strokeStyle = v.spell.c2;
                X.lineWidth = 1;
                X.globalAlpha = flicker * 0.5;
                X.beginPath();
                X.arc(clone.x, clone.y + 8, 10, 0, Math.PI * 2);
                X.stroke();
                X.globalAlpha = 1;
            }
        }
    },
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
