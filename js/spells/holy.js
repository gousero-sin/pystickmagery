// ═══════════════════════════════════════════════════════════════════════════
// holy.js — Holy & Light Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state, W, H } from '../core/state.js?v=7';
import { spawnP, explode, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';
import { SoundFX } from '../core/sounds.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';

export const SPELL_DEFS = [
    createHoldSpell({
        name: 'Choir Column', icon: '🎶', key: 'A',
        color: '#f2df7a', c2: '#fff3bf', core: '#ffffff',
        mana: 18, cd: 900, dmg: 0,
        holdStyle: 'holy', holdProfile: 'holy_column',
        holdR: 78, holdDrain: 0.2, holdLift: 0.55, holdHeal: 0.35, holdMana: 0.25,
        releaseR: 86, releaseDmg: 0,
        desc: 'Hold to raise a luminous column that suspends foes and restores the caster'
    }),
    createManifestSpell({
        name: 'Sanctuary Steps', icon: '🕊️',
        color: '#e7d46a', c2: '#fff0a8', core: '#ffffff',
        manifestStyle: 'holy', manifestEffect: 'holy_grace', manifestProfile: 'steps', manifestGlyph: '+',
        manifestDuration: 960,
        mana: 26, cd: 950, manifestArc: 18, manifestThickness: 10, manifestSegmentHp: 36, manifestHeal: 1.2,
        desc: 'Manifest radiant steps that heal allies, repel foes, and fade gently away'
    }),
    { name: 'Judgment', icon: '✨', key: 'M', color: '#ffee66', c2: '#ffffaa', core: '#ffffff', speed: 0, dmg: 130, mana: 85, cd: 7000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'holy', isJudgment: true, desc: 'Divine orbital strike (Ultimate)' },
    { name: 'Smite', icon: '⚔️', key: 'F', color: '#ffdd44', c2: '#ffee88', core: '#ffffff', speed: 0, dmg: 40, mana: 22, cd: 500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'holy', isSmite: true, smiteR: 40, desc: 'Divine beam strike from above' },
    { name: 'Guardian Spirit', icon: '👼', key: 'G', color: '#ffee77', c2: '#ffffbb', core: '#ffffff', speed: 0, dmg: 25, mana: 30, cd: 1500, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'holy', isGuardianSpirit: true, spiritDur: 400, spiritR: 35, desc: 'Orbiting spirit blocks and counterattacks' },
    { name: 'Divine Presence', icon: '🌟', key: 'H', category: 'Aura', color: '#ffdd66', c2: '#ffeeaa', core: '#ffffff', speed: 0, dmg: 6, mana: 35, cd: 2000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'holy', isDivinePresence: true, auraDur: 280, auraR: 70, desc: 'Radiant aura heals you, repels foes' },
    { name: 'Seraphic Wings', icon: '🪽', key: 'X', category: 'Dash', color: '#ffe37a', c2: '#fff5c8', core: '#ffffff', speed: 0, dmg: 0, mana: 20, cd: 650, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'holy', isSeraphicDash: true, wingDur: 1800, wingDashDur: 14, wingDashSpeed: 22, desc: 'First cast unfurls wings for boosted jumps; recast flies forward and opens in place' },
    { name: 'Radiant Cross', icon: '✝️', key: 'K', color: '#ffee55', c2: '#ffffcc', core: '#ffffff', speed: 0, dmg: 45, mana: 25, cd: 700, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'holy', isRadiantCross: true, beamLen: 180, desc: 'Holy light erupts in 4 directions, burning all in its path' },
    { name: 'Consecrate', icon: '🔆', key: 'L', color: '#ffdd44', c2: '#fff7aa', core: '#ffffff', speed: 0, dmg: 12, mana: 30, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'holy', isConsecrate: true, consecR: 90, consecDur: 300, desc: 'Hallow the ground — enemies within are scorched by divine fire' },
    { name: 'Sacred Seal', icon: '🔯', key: 'R', color: '#fff176', c2: '#ffffff', core: '#ffffff', speed: 0, dmg: 80, mana: 35, cd: 1600, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0, trail: 'holy', isSacredSeal: true, sealR: 60, desc: 'Place a divine trap — enemies who cross it are blasted by sacred fire' }
];

function removeHolyVfx(v) {
    const idx = state.vfxSequences.indexOf(v);
    if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

export const FIRE_HANDLERS = {
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    isJudgment: (s, ox, oy, tx, ty) => {
        SoundFX.playTone(800, 'sine', 0.4, 0.2); SoundFX.playTone(1600, 'sine', 0.4, 0.2);
        state.vfxSequences.push({ type: 'judgment', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, spell: s });
        state.player.inv = true;
        return true;
    },
    isSmite: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'smite', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playTone(1200, 'sine', 0.5, 0.2);
        return true;
    },
    isGuardianSpirit: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'guardian_spirit', state: 0, age: 0, spell: s });
        SoundFX.playSweep(800, 1200, 'sine', 0.4, 0.3);
        return true;
    },
    isDivinePresence: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'divine_presence', state: 0, age: 0, spell: s });
        SoundFX.playTone(600, 'sine', 0.4, 0.3);
        SoundFX.playTone(900, 'sine', 0.3, 0.3);
        spawnP(ox, oy, s.color, 15, 'sparkle');
        state.dynamicLights.push({ x: ox, y: oy, r: 100, color: s.color, int: 3, life: 10, ml: 10 });
        return true;
    },
    isSeraphicDash: (s, ox, oy, tx, ty) => {
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const angle = Math.atan2(ty - py, tx - px);
        const active = state.vfxSequences.find(v => v.type === 'seraph_wings' && v.state !== 4);
        if (active) {
            active.state = 1;
            active.age = 0;
            active.angle = angle;
            active.trail = [];
            SoundFX.playSweep(900, 1800, 'sine', 0.35, 0.18);
            spawnP(px, py, s.core, 12, 'sparkle');
        } else {
            state.vfxSequences.push({ type: 'seraph_wings', state: 0, age: 0, wingAge: 0, angle, spell: s, trail: [] });
            SoundFX.playTone(880, 'sine', 0.32, 0.25);
            SoundFX.playTone(1320, 'sine', 0.22, 0.25);
            spawnP(px, py, s.core, 18, 'sparkle');
        }
        return true;
    },
    isRadiantCross: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'radiant_cross', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playSweep(600, 2400, 'sine', 0.6, 0.4);
        state.dynamicLights.push({ x: tx, y: ty, r: 180, color: s.color, int: 4, life: 10, ml: 10 });
        return true;
    },
    isConsecrate: (s, ox, oy, tx, ty) => {
        state.vfxSequences.push({ type: 'consecrate', state: 0, age: 0, cx: tx, cy: ty, spell: s });
        SoundFX.playTone(440, 'sine', 0.3, 0.5);
        SoundFX.playTone(660, 'sine', 0.3, 0.5);
        spawnP(tx, ty, s.color, 12, 'sparkle');
        return true;
    },
    isSacredSeal: (s, ox, oy, tx, ty) => {
        const existing = state.vfxSequences.find(v => v.type === 'sacred_seal' && v.state === 0);
        if (existing) {
            existing.state = 1;
            existing.age = 0;
            SoundFX.playSweep(400, 2400, 'sine', 0.7, 0.5);
        } else {
            state.vfxSequences.push({ type: 'sacred_seal', state: 0, age: 0, cx: tx, cy: ty, spell: s });
            SoundFX.playTone(800, 'sine', 0.3, 0.3);
            spawnP(tx, ty, s.color, 8, 'sparkle');
        }
        return true;
    }
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    'seraph_wings': (v) => {
        const s = v.spell;
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        v.wingAge = (v.wingAge || 0) + 1;

        if (v.state === 0) {
            player.seraphWingBoostFrames = 4;
            player.castAnim = Math.max(player.castAnim || 0, 80);
            player.staffGlow = 240;
            if (player.vy > 1.5) player.vy *= 0.96;
            if (v.age % 4 === 0) {
                spawnP(px - 18, py + 2, s.core, 1, 'sparkle');
                spawnP(px + 18, py + 2, s.c2, 1, 'sparkle');
            }
            state.dynamicLights.push({ x: px, y: py, r: 72, color: s.core, int: 0.85, life: 2, ml: 2 });
            if (v.wingAge > (s.wingDur || 1800)) {
                spawnP(px, py, s.c2, 10, 'sparkle');
                removeHolyVfx(v);
            }
            return;
        }

        if (v.state === 1) {
            player.seraphWingBoostFrames = 4;
            player.castAnim = 240;
            player.castType = 'up';
            player.vx *= 0.6;
            player.vy *= 0.6;
            state.dynamicLights.push({ x: px, y: py, r: 86, color: s.core, int: 1.25, life: 2, ml: 2 });
            if (v.age > 5) {
                v.state = 2;
                v.age = 0;
                player.inv = true;
                SoundFX.playNoise(0.14, 0.08, 1600, 'highpass', 5);
            }
            return;
        }

        if (v.state === 2) {
            const dx = Math.cos(v.angle);
            const dy = Math.sin(v.angle);
            player.seraphWingBoostFrames = 4;
            player.x = clamp(player.x + dx * (s.wingDashSpeed || 22), 10, state.W - player.w - 10);
            player.y = clamp(player.y + dy * (s.wingDashSpeed || 22) * 0.62 - 1.2, 18, state.H - player.h - 24);
            player.vx = dx * 4.2;
            player.vy = dy * 2.8 - 1.1;
            player.onGround = false;
            const nx = player.x + player.w / 2;
            const ny = player.y + player.h / 2;
            v.trail.push({ x: nx, y: ny, life: 16, maxLife: 16 });
            if (v.trail.length > 10) v.trail.shift();
            for (const t of v.trail) t.life -= 1;
            if (v.age % 2 === 0) spawnP(nx - dx * 12, ny + 4, s.core, 2, 'sparkle');
            state.dynamicLights.push({ x: nx, y: ny, r: 80, color: s.core, int: 1.35, life: 2, ml: 2 });
            if (v.age > (s.wingDashDur || 14)) {
                v.state = 3;
                v.age = 0;
                player.inv = false;
                state.shockwaves.push({ x: nx, y: ny, r: 0, maxR: 62, life: 14, maxLife: 14, color: s.core });
                SoundFX.playTone(1040, 'sine', 0.24, 0.16);
            }
            return;
        }

        if (v.state === 3) {
            player.seraphWingBoostFrames = 4;
            if (v.age % 3 === 0) spawnP(px + (Math.random() - .5) * 42, py + (Math.random() - .5) * 32, s.core, 1, 'sparkle');
            state.dynamicLights.push({ x: px, y: py, r: 92, color: s.core, int: 0.9, life: 2, ml: 2 });
            if (v.age > 24) {
                v.state = 0;
                v.age = 0;
                v.trail = [];
            }
        }
    },
    'divine_presence': (v) => {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        v.cx = px;
        v.cy = py;
        // Heal player every 15 frames
        if (v.age % 15 === 0 && state.player.hp < 100) {
            state.player.hp = Math.min(100, state.player.hp + 1);
            spawnP(px, py - 10, '#ffffff', 2, 'sparkle');
        }
        // Damage and push enemies every 10 frames
        if (v.age % 10 === 0) {
            for (const e of state.entities) {
                if (!e.active) continue;
                const dx = e.x + e.w/2 - px, dy = e.y + e.h/2 - py;
                const d = Math.hypot(dx, dy);
                if (d < s.auraR) {
                    hurtEntity(e, s.dmg, px, py);
                    const pushF = 2 * (1 - d / s.auraR);
                    e.vx += (dx/d) * pushF;
                    e.vy += (dy/d) * pushF - 1;
                    spawnP(e.x + e.w/2, e.y + e.h/2, s.color, 3, 'burst');
                }
            }
        }
        // Holy sparkles around player
        if (v.age % 3 === 0) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * s.auraR;
            state.particles.push({
                x: px + Math.cos(a) * r, y: py + Math.sin(a) * r,
                vx: 0, vy: -0.8, life: 15, ml: 15, color: Math.random() > 0.5 ? s.color : s.core,
                size: 1.5 + Math.random(), grav: -0.02, type: 'sparkle'
            });
        }
        state.dynamicLights.push({ x: px, y: py, r: s.auraR + 10, color: s.color, int: 0.8 + Math.sin(v.age * 0.05) * 0.3, life: 2, ml: 2 });
        if (v.age > s.auraDur) {
            spawnP(px, py, s.core, 15, 'sparkle');
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    'smite': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            // Warning phase
            if (v.age === 1) {
                spawnP(v.cx, v.cy, s.color, 4, 'sparkle');
            }
            if (v.age > 15) {
                v.state = 1;
                v.age = 0;
            }
        } else if (v.state === 1) {
            // Strike phase
            if (v.age === 1) {
                // Damage entities
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dist = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
                    if (dist < s.smiteR) {
                        hurtEntity(e, s.dmg, v.cx, v.cy);
                        spawnP(e.x + e.w / 2, e.y + e.h / 2, s.color, 6, 'burst');
                    }
                }
                spawnP(v.cx, v.cy, s.color, 12, 'burst');
                state.shake(8);
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 150, color: s.color, int: 3, life: 8, ml: 8 });
            }
            if (v.age > 20) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'guardian_spirit': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            v.angle = (v.angle || 0) + 0.05;
            const px = state.player.x + state.player.w / 2;
            const py = state.player.y + state.player.h / 2;
            v.sx = px + Math.cos(v.angle) * s.spiritR;
            v.sy = py + Math.sin(v.angle) * s.spiritR;

            // Check for nearby enemy projectiles
            if (v.age % 6 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dist = Math.hypot(e.x + e.w / 2 - v.sx, e.y + e.h / 2 - v.sy);
                    if (dist < 50) {
                        hurtEntity(e, s.dmg, v.sx, v.sy);
                        spawnP(v.sx, v.sy, s.color, 8, 'burst');
                        v.hit = true;
                    }
                }
            }

            // Spawn trail
            if (v.age % 2 === 0) spawnP(v.sx, v.sy, s.color, 1, 'sparkle');

            // Timeout or hit
            if (v.hit || v.age > s.spiritDur) {
                if (v.hit) {
                    v.state = 1;
                    v.age = 0;
                } else {
                    const idx = state.vfxSequences.indexOf(v);
                    if (idx !== -1) state.vfxSequences.splice(idx, 1);
                }
            }
        } else if (v.state === 1) {
            // Fade state after hit
            if (v.age > 10) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'judgment': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            v.targets = []; for (const e of state.entities) { if (isEnemyEntity(e) && e.hp > 0) v.targets.push(e); }
            v.targetIdx = 0; v.origX = state.player.x; v.origY = state.player.y;
            if (v.targets.length === 0) { state.player.inv = false; const idx = state.vfxSequences.indexOf(v); if (idx !== -1) state.vfxSequences.splice(idx, 1); }
            else { v.state = 1; v.age = 0; SoundFX.playTone(1200, 'sine', 0.2, 0.4); }
        } else if (v.state === 1) {
            // Teleport strikes — every 6 frames dash to next target
            if (v.age % 6 === 0 && v.targetIdx < v.targets.length) {
                const t = v.targets[v.targetIdx];
                if (t.active) {
                    // Afterimage at old position
                    for (let k = 0; k < 3; k++) state.particles.push({ x: state.player.x + state.player.w / 2 + (Math.random() - .5) * 10, y: state.player.y + state.player.h / 2 + (Math.random() - .5) * 10, vx: 0, vy: 0, life: 12, ml: 12, color: s.color, size: 3, grav: 0, type: 'sparkle' });
                    // Teleport to target
                    const side = (Math.random() > .5 ? 1 : -1);
                    state.player.x = t.x + t.w / 2 - state.player.w / 2 + side * 25; state.player.y = t.y - 5;
                    state.player.castAnim = 280; state.player.castType = 'slash'; state.player.facing = -side;
                    // Slash VFX
                    SoundFX.playSweep(1200, 2000, 'sawtooth', 0.1, 0.3);
                    state.dynamicLights.push({ x: t.x + t.w / 2, y: t.y + t.h / 2, r: 60, color: '#ffee66', int: 2, life: 5, ml: 5 });
                    hurtEntity(t, Math.floor(s.dmg * 0.10), state.player.x, state.player.y);
                    state.shake(4);
                    // Speed lines
                    for (let k = 0; k < 8; k++) state.particles.push({ x: t.x + t.w / 2 + (Math.random() - .5) * 30, y: t.y + t.h / 2 + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 12, vy: (Math.random() - .5) * 3, life: 8, ml: 8, color: '#fff', size: 1, grav: 0, type: 'trail' });
                    spawnP(t.x + t.w / 2, t.y + t.h / 2, '#ffee66', 8, 'burst');
                }
                v.targetIdx++;
            }
            if (v.targetIdx >= v.targets.length && v.age > v.targets.length * 6 + 8) { v.state = 2; v.age = 0; }
        } else if (v.state === 2) {
            // Return to origin + front_pose
            if (v.age === 1) {
                SoundFX.playTone(800, 'sine', 0.5, 0.4);
                for (let k = 0; k < 5; k++) state.particles.push({ x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2, vx: 0, vy: 0, life: 10, ml: 10, color: s.color, size: 3, grav: 0, type: 'sparkle' });
                state.player.x = v.origX; state.player.y = v.origY;
            }
            state.player.castAnim = 280; state.player.castType = 'front_pose'; state.player.staffGlow = 280; state.player.vx = 0; state.player.vy = 0;
            // Swirling wind under feet
            if (v.age % 2 === 0) {
                const a = v.age * 0.3; const wr = 25 + Math.sin(v.age * 0.1) * 5;
                state.particles.push({ x: state.player.x + state.player.w / 2 + Math.cos(a) * wr, y: state.player.y + state.player.h + Math.sin(a) * wr * 0.3, vx: Math.cos(a) * 1, vy: -0.5, life: 15, ml: 15, color: '#ddeeff', size: 2, grav: 0, type: 'wind' });
                state.particles.push({ x: state.player.x + state.player.w / 2 + Math.cos(a + Math.PI) * wr, y: state.player.y + state.player.h + Math.sin(a + Math.PI) * wr * 0.3, vx: Math.cos(a + Math.PI) * 1, vy: -0.5, life: 15, ml: 15, color: '#fff', size: 2, grav: 0, type: 'wind' });
            }
            state.dynamicLights.push({ x: state.player.x + state.player.w / 2, y: state.player.y, r: 80 + v.age * 2, color: s.color, int: 1 + v.age / 30, life: 2, ml: 2 });
            if (v.age > 50) { v.state = 3; v.age = 0; }
        } else if (v.state === 3) {
            // Staff slam + light descends
            state.player.castAnim = 280; state.player.castType = 'slam'; state.player.vx = 0; state.player.vy = 0;
            if (v.age === 5) {
                SoundFX.playTone(1600, 'sine', 0.8, 0.6);
                state.shake(8);
                state.dynamicLights.push({ x: state.player.x + state.player.w / 2, y: 0, r: W, color: '#ffee88', int: 0.5, life: 20, ml: 20 });
            }
            // Light rays descending toward each target
            if (v.age > 5 && v.age < 25) {
                for (const t of v.targets) {
                    if (!t.active) continue;
                    const tx = t.x + t.w / 2;
                    if (v.age % 3 === 0) state.particles.push({ x: tx + (Math.random() - .5) * 10, y: -20, vx: 0, vy: 15, life: 30, ml: 30, color: '#ffee88', size: 3, grav: 0, type: 'trail' });
                }
            }
            if (v.age > 30) { v.state = 4; v.age = 0; }
        } else if (v.state === 4) {
            // Divine pillars obliterate
            if (v.age === 1) {
                SoundFX.playSweep(2000, 400, 'square', 1.0, 0.5); SoundFX.playNoise(1.0, 0.4, 800, 'highpass');
                state.player.inv = false; state.shake(50); state.player.castAnim = 0;
                for (const t of v.targets) {
                    const tx = t.x + t.w / 2, ty = t.y + t.h / 2;
                    state.dynamicLights.push({ x: tx, y: ty, r: 200, color: s.color, int: 5, life: 20, ml: 20 });
                    explode(tx, ty, 90, 12, s.dmg, '#ffee66', '#fff');
                    for (let k = 0; k < 4; k++) state.shockwaves.push({ x: tx, y: ty, r: 0, maxR: 100, life: 12 + k * 4, maxLife: 12 + k * 4, color: k % 2 ? '#fff' : s.color });
                    spawnP(tx, ty, '#fff', 40, 'explode');
                }
            }
        }
        if (v.age > 50) {
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    'radiant_cross': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (!v.beamProgress) v.beamProgress = 0;
            v.beamProgress = Math.min(1, v.beamProgress + 0.055);
            const currentLen = s.beamLen * v.beamProgress;
            const beamW = 22;
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            for (const [dx, dy] of dirs) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const ex2 = e.x+e.w/2-v.cx, ey2 = e.y+e.h/2-v.cy;
                    const along = ex2*dx + ey2*dy;
                    const perp = Math.abs(-ex2*dy + ey2*dx);
                    if (along > 0 && along < currentLen && perp < beamW/2) {
                        if (v.age % 4 === 0) {
                            hurtEntity(e, s.dmg * 0.1, v.cx, v.cy);
                            spawnP(e.x+e.w/2, e.y+e.h/2, s.color, 4, 'burst');
                        }
                    }
                }
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 100 + currentLen*0.5, color: s.color, int: 3 * v.beamProgress, life: 3, ml: 3 });
            if (v.beamProgress >= 1) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 80, color: s.color, int: 2*(1-v.age/20), life: 3, ml: 3 });
            if (v.age > 20) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    'consecrate': (v) => {
        const s = v.spell;
        if (v.age % 20 === 0) {
            for (const e of state.entities) {
                if (!e.active) continue;
                const d = Math.hypot(e.x+e.w/2-v.cx, e.y+e.h/2-v.cy);
                if (d < s.consecR) {
                    hurtEntity(e, s.dmg, v.cx, v.cy);
                    const angle = Math.atan2(e.y+e.h/2-v.cy, e.x+e.w/2-v.cx);
                    e.vx += Math.cos(angle) * 1.5;
                    e.vy -= 1;
                    spawnP(e.x+e.w/2, e.y+e.h/2, s.color, 5, 'burst');
                }
            }
            SoundFX.playTone(660 + Math.random()*100, 'sine', 0.1, 0.15);
        }
        if (v.age % 3 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * s.consecR;
            spawnP(v.cx + Math.cos(angle)*dist, v.cy + Math.sin(angle)*dist*0.4, s.color, 1, 'sparkle');
        }
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.consecR*0.7, color: s.color, int: 0.7 + Math.sin(v.age*0.05)*0.2, life: 3, ml: 3 });
        if (v.age > s.consecDur) {
            spawnP(v.cx, v.cy, s.color, 15, 'sparkle');
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    'sacred_seal': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            if (v.age % 6 === 0) spawnP(v.cx+(Math.random()-.5)*20, v.cy+(Math.random()-.5)*20, s.color, 1, 'sparkle');
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 30+Math.sin(v.age*0.08)*8, color: s.color, int: 0.8, life: 2, ml: 2 });
            for (const e of state.entities) {
                if (!e.active) continue;
                if (Math.hypot(e.x+e.w/2-v.cx, e.y+e.h/2-v.cy) < s.sealR*0.6) {
                    v.state = 1; v.age = 0; break;
                }
            }
            if (v.age > 800) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        } else if (v.state === 1) {
            if (v.age === 1) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const d = Math.hypot(e.x+e.w/2-v.cx, e.y+e.h/2-v.cy);
                    if (d < s.sealR*2) {
                        hurtEntity(e, s.dmg*(1-d/(s.sealR*2.5)), v.cx, v.cy);
                        e.vy -= 10*(1-d/(s.sealR*2));
                        spawnP(e.x+e.w/2, e.y+e.h/2, '#ffffff', 16, 'explode');
                    }
                }
                explode(v.cx, v.cy, s.sealR*1.5, 15, 0, s.color, '#ffffff');
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.sealR*2, life: 18, maxLife: 18, color: '#ffffff' });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.sealR, life: 12, maxLife: 12, color: s.color });
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 350, color: '#ffffff', int: 8, life: 15, ml: 15 });
                state.shake(22);
                SoundFX.playNoise(1.0, 0.5, 600, 'highpass');
                SoundFX.playSweep(200, 3000, 'sine', 0.9, 0.6);
                spawnP(v.cx, v.cy, '#ffffff', 30, 'explode');
                spawnP(v.cx, v.cy, s.color, 20, 'burst');
            }
            if (v.age > 30) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    }
};

export const VFX_DRAW = {
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    'seraph_wings': (v, X) => {
        const s = v.spell;
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2 + 1;
        const open = v.state === 0 ? Math.min(1, v.age / 18) : v.state === 3 ? Math.max(0.65, 1 - v.age / 42) : 0.78;
        const flap = Math.sin((v.wingAge || v.age) * 0.12) * 0.12;

        X.save();
        X.globalCompositeOperation = 'lighter';
        for (const t of v.trail || []) {
            const a = (t.life / t.maxLife) * 0.32;
            const g = X.createRadialGradient(t.x, t.y, 0, t.x, t.y, 30);
            g.addColorStop(0, s.core);
            g.addColorStop(0.45, s.c2);
            g.addColorStop(1, 'transparent');
            X.fillStyle = g;
            X.globalAlpha = a;
            X.beginPath();
            X.ellipse(t.x, t.y, 24, 10, v.angle || 0, 0, Math.PI * 2);
            X.fill();
        }

        X.translate(px, py);
        for (const side of [-1, 1]) {
            X.save();
            X.scale(side, 1);
            X.rotate(side * (-0.22 - open * 0.18 + flap));
            for (let i = 0; i < 5; i++) {
                const len = (24 + i * 8) * open;
                const y = -14 + i * 5;
                const feather = X.createLinearGradient(0, y, -len, y + 6);
                feather.addColorStop(0, `rgba(255,255,255,${0.72 * open})`);
                feather.addColorStop(0.5, `rgba(255,245,200,${0.48 * open})`);
                feather.addColorStop(1, 'transparent');
                X.fillStyle = feather;
                X.globalAlpha = 0.9 * open;
                X.beginPath();
                X.moveTo(-4, y);
                X.quadraticCurveTo(-len * 0.55, y - 13, -len, y + 2);
                X.quadraticCurveTo(-len * 0.48, y + 10, -4, y + 5);
                X.closePath();
                X.fill();
            }
            X.restore();
        }

        X.strokeStyle = s.core;
        X.lineWidth = 1.2;
        X.globalAlpha = 0.55 * open;
        X.beginPath();
        X.ellipse(0, -24, 14, 4, 0, 0, Math.PI * 2);
        X.stroke();
        X.restore();
        X.globalAlpha = 1;
    },
    'divine_presence': (v, X) => {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        const fade = v.age > v.spell.auraDur - 30 ? Math.max(0, (v.spell.auraDur - v.age) / 30) : 1;
        // Golden aura circle
        const grad = X.createRadialGradient(px, py, 0, px, py, s.auraR);
        grad.addColorStop(0, 'rgba(255,221,102,0.15)');
        grad.addColorStop(0.6, 'rgba(255,238,170,0.08)');
        grad.addColorStop(1, 'transparent');
        X.fillStyle = grad;
        X.globalAlpha = fade;
        X.beginPath();
        X.arc(px, py, s.auraR, 0, Math.PI * 2);
        X.fill();
        // Rotating light rings
        X.strokeStyle = s.color;
        X.lineWidth = 1.5;
        X.globalAlpha = 0.4 * fade;
        X.beginPath();
        X.arc(px, py, s.auraR * 0.7, v.age * 0.03, v.age * 0.03 + Math.PI * 1.2);
        X.stroke();
        X.beginPath();
        X.arc(px, py, s.auraR * 0.5, -v.age * 0.04, -v.age * 0.04 + Math.PI);
        X.stroke();
        // Cross of light at center
        X.strokeStyle = s.core;
        X.lineWidth = 1;
        X.globalAlpha = 0.3 * fade;
        const cr = 12;
        X.beginPath(); X.moveTo(px - cr, py); X.lineTo(px + cr, py); X.stroke();
        X.beginPath(); X.moveTo(px, py - cr); X.lineTo(px, py + cr); X.stroke();
        X.globalAlpha = 1;
    },
    'smite': (v, X) => {
        const s = v.spell;
        if (v.state === 0) {
            // Pulsing golden circle on ground
            const pulse = 1 + Math.sin(v.age * 0.3) * 0.2;
            X.strokeStyle = s.color;
            X.lineWidth = 2;
            X.globalAlpha = 0.7;
            X.beginPath();
            X.arc(v.cx, v.cy, 25 * pulse, 0, Math.PI * 2);
            X.stroke();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Vertical beam of light
            if (v.age === 1) {
                X.fillStyle = '#fff';
                X.globalAlpha = 0.8;
                X.fillRect(0, 0, W, H);
            }
            const beamAlpha = Math.max(0, 1 - v.age / 20);
            X.globalAlpha = beamAlpha;
            const grad = X.createLinearGradient(v.cx - 30, 0, v.cx + 30, 0);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.5, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.fillRect(v.cx - 30, -100, 60, H + 200);
            X.globalAlpha = 1;
        }
    },
    'guardian_spirit': (v, X) => {
        const s = v.spell;
        if (v.sx && v.sy) {
            const alpha = v.state === 0 ? 1 : Math.max(0, 1 - v.age / 10);
            X.globalAlpha = alpha;
            // Draw glowing golden orb
            const grad = X.createRadialGradient(v.sx, v.sy, 0, v.sx, v.sy, 8);
            grad.addColorStop(0, '#ffff99');
            grad.addColorStop(0.5, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.beginPath();
            X.arc(v.sx, v.sy, 8, 0, Math.PI * 2);
            X.fill();

            // Wings shape
            X.fillStyle = s.color;
            X.globalAlpha = alpha * 0.6;
            X.beginPath();
            X.arc(v.sx - 8, v.sy - 2, 4, 0, Math.PI * 2);
            X.fill();
            X.beginPath();
            X.arc(v.sx + 8, v.sy - 2, 4, 0, Math.PI * 2);
            X.fill();
            X.globalAlpha = 1;
        }
    },
    'judgment': (v, X) => {
        if (v.state === 1 && v.targets) {
            X.strokeStyle = '#ffee66'; X.lineWidth = 1; X.globalAlpha = 0.3;
            for (let k = 0; k < 15; k++) {
                const x1 = Math.random() * W, y1 = Math.random() * H;
                X.beginPath(); X.moveTo(x1, y1); X.lineTo(x1 + (Math.random() - .5) * 80, y1 + (Math.random() - .5) * 20); X.stroke();
            }
            X.globalAlpha = 1;
        } else if (v.state === 2) {
            const r = 40 + v.age * 0.8;
            const grad = X.createRadialGradient(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 0, state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, r);
            grad.addColorStop(0, 'rgba(255,238,102,0.4)'); grad.addColorStop(1, 'transparent');
            X.fillStyle = grad; X.beginPath(); X.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, r, 0, Math.PI * 2); X.fill();
            X.strokeStyle = v.spell.color; X.lineWidth = 2; X.globalAlpha = 0.6 + Math.sin(v.age * 0.2) * 0.3;
            for (const t of v.targets) {
                if (!t.active) continue; const tx = t.x + t.w / 2, ty = t.y + t.h / 2;
                X.beginPath(); X.ellipse(tx, ty + t.h / 2, 22, 7, v.age * 0.08, 0, Math.PI * 2); X.stroke();
                X.beginPath(); X.ellipse(tx, ty + t.h / 2, 12, 4, -v.age * 0.08, 0, Math.PI * 2); X.stroke();
            }
            X.globalAlpha = 1;
        } else if (v.state === 3) {
            X.globalAlpha = Math.min(0.3, v.age / 30); X.fillStyle = '#ffee88'; X.fillRect(0, 0, W, H); X.globalAlpha = 1;
            X.strokeStyle = '#ffee66'; X.lineWidth = 3; X.globalAlpha = 0.5;
            for (const t of v.targets) {
                if (!t.active) continue; const tx = t.x + t.w / 2;
                X.beginPath(); X.moveTo(tx, 0); X.lineTo(tx, Math.min(v.age * 15, t.y + t.h)); X.stroke();
            }
            X.globalAlpha = 1;
        } else if (v.state === 4) {
            const flash = Math.max(0, 1 - v.age / 12);
            X.globalAlpha = flash * 0.6; X.fillStyle = '#fff'; X.fillRect(0, 0, W, H); X.globalAlpha = 1;
            X.globalAlpha = Math.max(0, 1 - v.age / 40);
            for (const t of v.targets) {
                if (!t.active) continue; const tx = t.x + t.w / 2;
                X.fillStyle = 'rgba(255,255,255,0.9)'; X.fillRect(tx - 12, 0, 24, H);
                X.fillStyle = 'rgba(255,238,102,0.4)'; X.fillRect(tx - 35, 0, 70, H);
            }
            X.globalAlpha = 1;
        }
    },
    'radiant_cross': (v, X) => {
        const s = v.spell;
        const prog = v.beamProgress || 0;
        const currentLen = s.beamLen * prog;
        const beamW = 22;
        const alpha = v.state === 1 ? Math.max(0, 1 - v.age/20) : prog;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        X.save();
        X.translate(v.cx, v.cy);
        for (const [dx, dy] of dirs) {
            X.save();
            X.rotate(Math.atan2(dy, dx));
            // Outer glow
            const grd = X.createLinearGradient(0, 0, currentLen, 0);
            grd.addColorStop(0, `rgba(255,238,85,${0.85*alpha})`);
            grd.addColorStop(0.7, `rgba(255,255,255,${0.6*alpha})`);
            grd.addColorStop(1, `rgba(255,238,85,0)`);
            X.fillStyle = grd;
            X.globalAlpha = alpha;
            X.fillRect(0, -beamW/2, currentLen, beamW);
            // Core
            X.fillStyle = `rgba(255,255,255,${0.9*alpha})`;
            X.fillRect(0, -3, currentLen * 0.95, 6);
            X.restore();
        }
        // Center burst
        const cg = X.createRadialGradient(0, 0, 0, 0, 0, 32*prog);
        cg.addColorStop(0, `rgba(255,255,255,${alpha})`);
        cg.addColorStop(0.5, `rgba(255,238,85,${0.6*alpha})`);
        cg.addColorStop(1, 'transparent');
        X.fillStyle = cg;
        X.globalAlpha = alpha;
        X.beginPath();
        X.arc(0, 0, 32*prog, 0, Math.PI*2);
        X.fill();
        X.restore();
        X.globalAlpha = 1;
    },
    'consecrate': (v, X) => {
        const s = v.spell;
        const fade = v.age > s.consecDur-40 ? Math.max(0, (s.consecDur-v.age)/40) : 1;
        const pulse = 0.82 + Math.sin(v.age*0.05)*0.15;
        // Sacred ground fill
        const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, s.consecR);
        grad.addColorStop(0, `rgba(255,238,85,${0.22*fade})`);
        grad.addColorStop(0.65, `rgba(255,238,85,${0.07*fade})`);
        grad.addColorStop(1, 'transparent');
        X.fillStyle = grad;
        X.globalAlpha = fade;
        X.beginPath();
        X.arc(v.cx, v.cy, s.consecR, 0, Math.PI*2);
        X.fill();
        // Outer ring
        X.strokeStyle = s.color;
        X.lineWidth = 2;
        X.globalAlpha = 0.65*fade;
        X.beginPath();
        X.arc(v.cx, v.cy, s.consecR*pulse, 0, Math.PI*2);
        X.stroke();
        // Rotating rune arms
        X.save();
        X.translate(v.cx, v.cy);
        X.rotate(v.age*0.025);
        X.strokeStyle = s.c2;
        X.lineWidth = 1;
        X.globalAlpha = 0.5*fade;
        for (let i = 0; i < 4; i++) {
            const a = (i/4)*Math.PI*2;
            X.beginPath();
            X.moveTo(Math.cos(a)*22, Math.sin(a)*22);
            X.lineTo(Math.cos(a)*s.consecR*0.8, Math.sin(a)*s.consecR*0.8);
            X.stroke();
        }
        // Center cross
        X.rotate(-v.age*0.05);
        X.strokeStyle = '#ffffff';
        X.lineWidth = 1.5;
        X.globalAlpha = 0.65*fade;
        X.beginPath(); X.moveTo(-18, 0); X.lineTo(18, 0); X.stroke();
        X.beginPath(); X.moveTo(0, -18); X.lineTo(0, 18); X.stroke();
        X.restore();
        X.globalAlpha = 1;
    },
    'sacred_seal': (v, X) => {
        const s = v.spell;
        if (v.state === 0) {
            const pulse = 0.6 + Math.sin(v.age*0.07)*0.25;
            X.save();
            X.translate(v.cx, v.cy);
            X.rotate(v.age*0.012);
            // Outer glyph circle
            X.strokeStyle = s.color;
            X.lineWidth = 2;
            X.globalAlpha = pulse*0.85;
            X.beginPath();
            X.arc(0, 0, s.sealR*0.58, 0, Math.PI*2);
            X.stroke();
            // Inner triangle pair (star of david style)
            X.strokeStyle = s.c2;
            X.lineWidth = 1.5;
            X.globalAlpha = pulse*0.65;
            for (let t = 0; t < 2; t++) {
                X.beginPath();
                for (let i = 0; i < 3; i++) {
                    const a = (i/3)*Math.PI*2 + (t === 1 ? Math.PI/3 : 0);
                    const r2 = s.sealR*0.48;
                    i === 0 ? X.moveTo(Math.cos(a)*r2, Math.sin(a)*r2) : X.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
                }
                X.closePath();
                X.stroke();
            }
            // Center glow
            const g = X.createRadialGradient(0, 0, 0, 0, 0, 12);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.6, s.color);
            g.addColorStop(1, 'transparent');
            X.fillStyle = g;
            X.globalAlpha = pulse;
            X.beginPath();
            X.arc(0, 0, 12, 0, Math.PI*2);
            X.fill();
            X.restore();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            const a = Math.max(0, 1-v.age/14);
            X.globalAlpha = a*0.75;
            X.fillStyle = '#ffffff';
            X.fillRect(0, 0, W, H);
            const ba = Math.max(0, 0.85-v.age/22);
            const bg = X.createLinearGradient(v.cx-45, 0, v.cx+45, 0);
            bg.addColorStop(0, 'transparent');
            bg.addColorStop(0.5, `rgba(255,255,221,${ba})`);
            bg.addColorStop(1, 'transparent');
            X.fillStyle = bg;
            X.globalAlpha = 1;
            X.fillRect(v.cx-45, -50, 90, H+50);
            X.globalAlpha = 1;
        }
    }
};
