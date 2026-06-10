// wind.js — Wind & Air Spells Module
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
    { name: 'Wind Blast', icon: '💨', key: '8', color: '#99ddbb', c2: '#cceecc', core: '#eeffee', speed: 0, dmg: 8, mana: 14, cd: 350, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isWind: true, windR: 180, windF: 25, desc: 'Massive knockback push' },
    { name: 'Air Blade', icon: '🗡️', key: 'T', color: '#ddffee', c2: '#ffffff', core: '#aaffcc', speed: 22, dmg: 18, mana: 10, cd: 200, r: 4, grav: 0, drag: 1, bounce: 0, trail: 'wind', isAirBlade: true, piercing: true, desc: 'High-speed piercing wind cutter' },
    { name: 'Updraft', icon: '🌪️', key: 'Y', color: '#ccffee', c2: '#eeffff', core: '#aaddbb', speed: 0, dmg: 15, mana: 20, cd: 600, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isUpdraft: true, desc: 'Launches enemies high into the air' },
    { name: 'Tornado', icon: '🌪️', key: 'U', color: '#88aacc', c2: '#aaccee', core: '#ddeeff', speed: 0, dmg: 6, mana: 30, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isTornado: true, torDur: 250, torR: 65, torF: 1.2, desc: 'Moving vortex lifts objects' },
    { name: 'Zephyr Dash', icon: '🪽', key: 'O', category: 'Dash', color: '#b9fff1', c2: '#e8ffff', core: '#ffffff', speed: 0, dmg: 0, mana: 18, cd: 950, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isZephyrDash: true, dashDur: 12, dashSpeed: 28, dashR: 38, desc: 'Air-step burst that parts enemies aside and leaves a soft slipstream' },
    { name: 'Vacuum Bomb', icon: '🫧', key: 'P', color: '#445566', c2: '#778899', core: '#bbccdd', speed: 8, dmg: 30, mana: 24, cd: 700, r: 5, grav: .1, drag: .998, bounce: 0, exR: 0, exF: 0, trail: 'wind', isVacuumBomb: true, vacR: 100, vacDur: 40, desc: 'Implodes on impact, then detonates' },
    { name: 'Sonic Boom', icon: '💥', key: 'Q', color: '#eeffff', c2: '#bbddee', core: '#ffffff', speed: 0, dmg: 20, mana: 20, cd: 600, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isSonicBoom: true, boomR: 150, boomF: 22, boomAngle: 0.7, desc: 'Directional shockwave cone' },
    { name: 'Cyclone Blades', icon: '🔄', key: 'F', category: 'Orbit', color: '#aaeedd', c2: '#ddfff0', core: '#ffffff', speed: 0, dmg: 12, mana: 28, cd: 1200, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isCycloneBlades: true, orbitDur: 300, orbitR: 50, bladeCount: 4, desc: 'Orbiting wind blades slice enemies' },
    createHoldSpell({
        name: 'Slipstream', icon: '🪽', key: 'A',
        color: '#b8ecf6', c2: '#e8ffff', core: '#ffffff',
        mana: 16, cd: 820, dmg: 0,
        holdStyle: 'wind', holdProfile: 'wind_slipstream',
        holdWidth: 28, holdR: 96, holdDrain: 0.18, holdForce: 0.58, holdLift: 0.75,
        releaseR: 70, releaseDmg: 0,
        desc: 'Hold to sustain a semi-invisible pressure current that makes bodies fly'
    }),
    createManifestSpell({
        name: 'Air Pressure', icon: '🪶',
        color: '#9fe8ef', c2: '#d7ffff', core: '#ffffff',
        manifestStyle: 'wind', manifestEffect: 'wind_lift', manifestProfile: 'current', manifestGlyph: '~',
        manifestSolid: false, manifestDuration: 520,
        mana: 22, cd: 850, manifestArc: 30, manifestThickness: 24, manifestSegmentHp: 18, manifestBuildRate: 0.06,
        desc: 'Manifest a semi-invisible pressure current that makes targets fly'
    }),
    { name: 'Eye of the Storm', icon: '🌀', key: 'I', color: '#224455', c2: '#557788', core: '#aaccdd', speed: 0, dmg: 10, mana: 80, cd: 6000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isStorm: true, desc: 'Massive hurricane (Ultimate)' }
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    isWind(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'windblast', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isUpdraft(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'updraft', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isStorm(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'storm', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2 - 40, spell: s
        });
        state.player.inv = true;
        return true;
    },
    isTornado(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'tornado', state: 0, age: 0, tx, ty, cx: tx, cy: ty, spell: s });
        return true;
    },
    isZephyrDash(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'zephyr_dash', state: 0, age: 0,
            angle: Math.atan2(ty - oy, tx - ox),
            spell: s,
            trail: [],
            hitList: [],
        });
        return true;
    },
    isCycloneBlades(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'cyclone_blades', state: 0, age: 0, spell: s, hitTimers: {} });
        SoundFX.playSweep(600, 1200, 'triangle', 0.2, 0.2);
        spawnP(ox, oy, s.color, 10, 'burst');
        return true;
    },
    isSonicBoom(s, ox, oy, tx, ty) {
        const angle = Math.atan2(ty - oy, tx - ox);
        for (const e of state.entities) {
            if (!e.active) continue;
            const dx = e.x + e.w / 2 - ox;
            const dy = e.y + e.h / 2 - oy;
            const d = Math.hypot(dx, dy);
            if (d < s.boomR) {
                const eAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(eAngle - angle);
                if (angleDiff < s.boomAngle || angleDiff > Math.PI * 2 - s.boomAngle) {
                    hurtEntity(e, s.dmg, ox, oy);
                    const pushDist = s.boomR - d;
                    const pushForce = s.boomF * (1 - d / s.boomR);
                    e.vx += Math.cos(angle) * pushForce;
                    e.vy += Math.sin(angle) * pushForce;
                    spawnP(e.x + e.w / 2, e.y + e.h / 2, s.color, 4, 'burst');
                }
            }
        }
        for (let i = 0; i < 20; i++) {
            const a = angle + (Math.random() - 0.5) * s.boomAngle * 2;
            spawnP(ox + Math.cos(a) * 30, oy + Math.sin(a) * 30, s.color, 2, 'trail');
        }
        SoundFX.playNoise(0.6, 0.4, 400, 'lowpass');
        state.shake(10);
        state.vfxSequences.push({ type: 'sonic_boom', state: 0, age: 0, cx: ox, cy: oy, spell: s, angle });
        return true;
    }
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
export const PROJ_HOOKS = {
    isTornadoProj: {
        onUpdate(p, s) {
            const t = p.age;
            // ── Multi-layer funnel ──
            // Outer wide spiral (debris ring)
            if (t % 1 === 0) {
                for (let layer = 0; layer < 4; layer++) {
                    const h = layer * s.torR * 0.6; // vertical offset per layer
                    const layerR = s.torR * (0.15 + layer * 0.25); // widens upward
                    const a = t * 0.5 + layer * 1.2 + Math.random() * 0.5;
                    const x = p.x + Math.cos(a) * layerR;
                    const y = p.y - h + 15;
                    state.particles.push({
                        x, y,
                        vx: Math.cos(a + Math.PI * 0.6) * (layerR * 0.2) + p.vx * 0.3,
                        vy: -1.5 - layer * 0.5 - Math.random(),
                        life: 14 + layer * 3, ml: 20,
                        color: layer < 2 ? s.c2 : s.color,
                        size: 2 + layer * 1.5 + Math.random() * 2,
                        grav: -0.06, type: 'cloud'
                    });
                }
            }
            // Inner bright core spiral
            if (t % 2 === 0) {
                const coreA = t * 0.8;
                const coreR = s.torR * 0.12;
                state.particles.push({
                    x: p.x + Math.cos(coreA) * coreR,
                    y: p.y + 10,
                    vx: Math.cos(coreA + Math.PI / 2) * 2,
                    vy: -3 - Math.random() * 2,
                    life: 18, ml: 18, color: s.core,
                    size: 3 + Math.random() * 2, grav: -0.08, type: 'sparkle'
                });
            }
            // Debris particles at base
            if (t % 5 === 0) {
                for (let k = 0; k < 3; k++) {
                    const da = Math.random() * Math.PI * 2;
                    const dd = Math.random() * s.torR * 0.8;
                    state.particles.push({
                        x: p.x + Math.cos(da) * dd,
                        y: p.y + 15 + Math.random() * 5,
                        vx: Math.cos(da + Math.PI / 2) * 3,
                        vy: -2 - Math.random() * 4,
                        life: 25, ml: 25,
                        color: ['#886644', '#665533', '#998866', '#554433'][Math.floor(Math.random() * 4)],
                        size: 2 + Math.random() * 3, grav: 0.08, type: 'debris',
                        rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.4
                    });
                }
            }
            // Dynamic light pulsing
            state.dynamicLights.push({
                x: p.x, y: p.y - s.torR * 0.5,
                r: s.torR * 1.8 + Math.sin(t * 0.15) * 20,
                color: s.color, int: 0.6 + Math.sin(t * 0.1) * 0.3,
                life: 2, ml: 2
            });
            // Periodic mini-shockwave at base
            if (t % 30 === 0) {
                state.shockwaves.push({ x: p.x, y: p.y + 10, r: 0, maxR: s.torR * 0.6, life: 8, maxLife: 8, color: s.c2 });
            }
            // ── Lift entities ──
            if (t % 6 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dx = p.x - (e.x + e.w / 2), dy = p.y - (e.y + e.h / 2), dist = Math.hypot(dx, dy);
                    if (dist < s.torR * 1.5) {
                        const f = s.torF * (1 - dist / (s.torR * 1.5)) / (e.mass || 1);
                        // Spiral pull (tangential + radial)
                        const ang = Math.atan2(dy, dx);
                        e.vx += Math.cos(ang) * f * 1.5 + Math.cos(ang + Math.PI / 2) * f * 2;
                        e.vy -= Math.abs(f) * 4 + 1.5;
                        if (e.rotV !== undefined) e.rotV += f * .3;
                        hurtEntity(e, s.dmg, p.x, p.y);
                    }
                }
            }
            return t > s.torDur; // Remove after duration
        },
        onLand(p, s, hitPlat, hitEntity) {
            spawnP(p.x, p.y, s.c2, 20, 'burst');
            spawnP(p.x, p.y, s.color, 10, 'explode');
            state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: s.torR, life: 12, maxLife: 12, color: s.c2 });
        }
    },
    isAirBlade: {
        onUpdate(p, s) {
            if (p.age % 2 === 0) {
                state.particles.push({
                    x: p.x + (Math.random() - 0.5) * 10, y: p.y + (Math.random() - 0.5) * 10,
                    vx: p.vx * 0.2, vy: p.vy * 0.2,
                    life: 10, ml: 10, color: s.c2, size: 1.5, grav: 0, type: 'trail'
                });
            }
        }
    },

    isVacuumBomb: {
        onLand(p, s, hitPlat, hitEntity) {
            state.vfxSequences.push({ type: 'vacuum_bomb', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
            SoundFX.playSweep(600, 200, 'sine', 0.3, 0.2);
        }
    }
};

function removeWindVfx(v) {
    const idx = state.vfxSequences.indexOf(v);
    if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function distToPath(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    return Math.hypot(px - cx, py - cy);
}

// ── VFX Updaters ───────────────────────────────────────────────────────────
export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    cyclone_blades(v) {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        const bladeCount = s.bladeCount || 4;
        // Check collision with enemies for each blade
        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2 + v.age * 0.12;
            const bx = px + Math.cos(angle) * s.orbitR;
            const by = py + Math.sin(angle) * s.orbitR;
            for (const e of state.entities) {
                if (!e.active) continue;
                const d = Math.hypot(e.x + e.w/2 - bx, e.y + e.h/2 - by);
                if (d < 25) {
                    const eId = e.id || state.entities.indexOf(e);
                    const lastHit = v.hitTimers[eId] || 0;
                    if (v.age - lastHit > 15) {
                        v.hitTimers[eId] = v.age;
                        hurtEntity(e, s.dmg, bx, by);
                        spawnP(bx, by, s.core, 5, 'burst');
                        SoundFX.playSweep(800, 1400, 'triangle', 0.08, 0.05);
                        const pushAngle = angle + Math.PI / 2;
                        e.vx += Math.cos(pushAngle) * 3;
                        e.vy += Math.sin(pushAngle) * 3 - 1;
                    }
                }
            }
            // Trail particles
            if (v.age % 2 === 0) {
                state.particles.push({
                    x: bx, y: by,
                    vx: Math.cos(angle + Math.PI) * 2, vy: Math.sin(angle + Math.PI) * 2,
                    life: 8, ml: 8, color: s.c2, size: 2, grav: 0, type: 'trail'
                });
            }
        }
        // Sound and light
        if (v.age % 10 === 0) state.dynamicLights.push({ x: px, y: py, r: s.orbitR + 20, color: s.color, int: 0.4, life: 5, ml: 5 });
        if (v.age > s.orbitDur) {
            spawnP(px, py, s.c2, 20, 'burst');
            state.shockwaves.push({ x: px, y: py, r: 0, maxR: s.orbitR + 10, life: 8, maxLife: 8, color: s.c2 });
            const idx = state.vfxSequences.indexOf(v);
            if (idx !== -1) state.vfxSequences.splice(idx, 1);
        }
    },
    windblast(v) {
        const s = v.spell;
        if (v.state === 0) {
            SoundFX.playNoise(0.5, 0.4, 800, 'lowpass');
            state.shake(12);
            state.shockwaves.push({ x: v.tx, y: v.ty, r: 0, maxR: s.windR, life: 14, maxLife: 14, color: s.color });

            // The push logic
            for (const e of state.entities) {
                if (!e.active) continue;
                const dx = (e.x + e.w / 2) - v.tx, dy = (e.y + e.h / 2) - v.ty;
                const d = Math.hypot(dx, dy);
                if (d < s.windR) {
                    const i2 = 1 - d / s.windR;
                    e.vx += (dx / d) * s.windF * i2 / (e.mass || 1);
                    e.vy += (dy / d) * s.windF * i2 / (e.mass || 1) - 4;
                    if (e.rotV !== undefined) e.rotV += (Math.random() - .5) * 1.5;
                    hurtEntity(e, s.dmg, v.tx, v.ty);
                }
            }

            // Particle blast
            for (let k = 0; k < 40; k++) {
                const a = Math.random() * Math.PI * 2, spd = Math.random() * 15 + 5;
                state.particles.push({
                    x: v.tx, y: v.ty,
                    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    life: 20 + Math.random() * 10, ml: 30,
                    color: k % 3 === 0 ? s.core : s.color,
                    size: 2 + Math.random() * 3, grav: 0.05, type: 'dust'
                });
            }
            v.state = 1; v.age = 0;
        } else if (v.state === 1) {
            if (v.age > 10) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    updraft(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Ground warning
            if (v.age === 1) {
                SoundFX.playSweep(400, 800, 'sine', 0.5, 0.3);
                state.shake(5);
                // Find ground
                v.gy = state.H;
                for (const p of state.platforms) { if (v.tx > p.x && v.tx < p.x + p.w && p.y >= v.ty) v.gy = Math.min(v.gy, p.y); }
            }
            if (v.age % 2 === 0) spawnP(v.tx + (Math.random() - .5) * 40, v.gy - 5, s.color, 2, 'dust');
            if (v.age > 20) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            // Eruption
            if (v.age === 1) {
                SoundFX.playNoise(0.8, 0.6, 1200, 'bandpass');
                state.shake(15);
                state.dynamicLights.push({ x: v.tx, y: v.gy, r: 150, color: s.core, int: 2, life: 10, ml: 10 });

                // Launch entities
                for (const e of state.entities) {
                    if (!e.active) continue;
                    if (Math.abs((e.x + e.w / 2) - v.tx) < 60 && Math.abs((e.y + e.h) - v.gy) < 80) {
                        e.vy = -25 / (e.mass || 1);
                        if (e.rotV !== undefined) e.rotV += (Math.random() - .5) * 2;
                        hurtEntity(e, s.dmg, v.tx, v.gy);
                    }
                }

                // Upward wind lines
                for (let k = 0; k < 30; k++) {
                    state.particles.push({
                        x: v.tx + (Math.random() - 0.5) * 80, y: v.gy,
                        vx: (Math.random() - 0.5) * 2, vy: -15 - Math.random() * 10,
                        life: 30, ml: 30, color: Math.random() > .5 ? s.core : s.c2,
                        size: 2 + Math.random() * 4, grav: -0.1, type: 'trail'
                    });
                }
            }
            if (v.age > 15) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    storm(v) {
        const s = v.spell;
        // Eye of the Storm Ultimate
        if (v.state === 0) {
            // Charge up: floating, gathering wind
            if (v.age === 1) {
                SoundFX.playSweep(100, 400, 'sine', 1.5, 0.4);
                state.player.castAnim = 600; state.player.castType = 'up';
                state.player.vy = -2; // slightly float
            }
            state.player.vx *= 0.8;
            state.player.vy *= 0.8;

            state.shake(Math.min(v.age / 10, 8));

            // Wind gathering inward
            if (v.age % 2 === 0) {
                const a = Math.random() * Math.PI * 2, r = 200 - v.age * 2;
                if (r > 20) {
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r,
                        vx: -Math.cos(a) * 5, vy: -Math.sin(a) * 5,
                        life: 20, ml: 20, color: s.color, size: 2, grav: 0, type: 'wind'
                    });
                }
            }

            if (v.age > 80) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            // Hurricane erupts
            if (v.age === 1) {
                SoundFX.playNoise(2.0, 0.8, 600, 'lowpass');
                state.shake(25);
                state.player.castAnim = 300; state.player.castType = 'burst';
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 400, color: s.core, int: 3, life: 15, ml: 15 });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: state.W, life: 25, maxLife: 25, color: s.c2 });
            }

            state.player.vx = 0; state.player.vy = 0;
            state.shake(12);

            // Raging wind across entire screen
            if (v.age % 1 === 0) {
                for (let k = 0; k < 6; k++) {
                    const a = v.age * 0.1 + k * Math.PI / 3;
                    const r = Math.random() * (state.W * 0.8);
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r,
                        vx: Math.cos(a + Math.PI / 2) * 15, vy: Math.sin(a + Math.PI / 2) * 15,
                        life: 25, ml: 25, color: Math.random() > 0.5 ? s.color : s.core,
                        size: 2 + Math.random() * 4, grav: 0, type: 'wind'
                    });
                }
            }

            // Pull and damage enemies
            if (v.age % 5 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dx = v.cx - (e.x + e.w / 2), dy = v.cy - (e.y + e.h / 2);
                    const d = Math.hypot(dx, dy);
                    e.vx += (dx / d) * 4 / (e.mass || 1);
                    e.vy += (dy / d) * 4 / (e.mass || 1) - 1; // Slight lift
                    if (e.rotV !== undefined) e.rotV += (Math.random() - .5);
                    hurtEntity(e, s.dmg, e.x + e.w / 2, e.y + e.h / 2);
                    spawnP(e.x + e.w / 2, e.y + e.h / 2, s.color, 3, 'burst');
                }
            }

            if (v.age > 200) { v.state = 2; v.age = 0; }
        } else if (v.state === 2) {
            // Final blast outward
            if (v.age === 1) {
                SoundFX.playNoise(2.5, 0.6, 200, 'highpass');
                SoundFX.playSweep(600, 100, 'square', 1.0, 0.5);
                state.shake(35);
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 600, color: '#ffffff', int: 4, life: 20, ml: 20 });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: state.W * 1.5, life: 30, maxLife: 30, color: '#ffffff' });

                for (let k = 0; k < 100; k++) {
                    const a = Math.random() * Math.PI * 2, spd = Math.random() * 25 + 10;
                    state.particles.push({
                        x: v.cx, y: v.cy,
                        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                        life: 30 + Math.random() * 20, ml: 50, color: Math.random() > 0.3 ? s.c2 : '#ffffff',
                        size: 3 + Math.random() * 5, grav: 0, type: 'trail'
                    });
                }

                // Massive fling
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dx = (e.x + e.w / 2) - v.cx, dy = (e.y + e.h / 2) - v.cy;
                    const d = Math.max(Math.hypot(dx, dy), 10);
                    e.vx += (dx / d) * 40 / (e.mass || 1);
                    e.vy += (dy / d) * 40 / (e.mass || 1);
                    hurtEntity(e, s.dmg * 5, v.cx, v.cy);
                }

                state.player.inv = false;
            }

            if (v.age > 40) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    tornado(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Find ground level
            v.gy = state.H - 24;
            for (const p of state.platforms) { if (v.cx > p.x && v.cx < p.x + p.w && p.y >= v.ty) v.gy = Math.min(v.gy, p.y); }
            v.state = 1; v.age = 0;
            SoundFX.playNoise(1.0, 0.5, 600, 'bandpass');
        } else if (v.state === 1) {
            const t = v.age;
            // Slow drift toward cursor direction
            v.cx += (state.player.facing || 1) * 1.5;
            // Multi-layer funnel particles
            for (let layer = 0; layer < 4; layer++) {
                const h = layer * s.torR * 0.6;
                const layerR = s.torR * (0.15 + layer * 0.25);
                const a = t * 0.5 + layer * 1.2 + Math.random() * 0.5;
                state.particles.push({ x: v.cx + Math.cos(a) * layerR, y: v.gy - h + 15, vx: Math.cos(a + Math.PI * 0.6) * layerR * 0.2 + (state.player.facing || 1) * 0.5, vy: -1.5 - layer * 0.5 - Math.random(), life: 14 + layer * 3, ml: 20, color: layer < 2 ? s.c2 : s.color, size: 2 + layer * 1.5 + Math.random() * 2, grav: -0.06, type: 'cloud' });
            }
            // Inner bright core
            if (t % 2 === 0) {
                const coreA = t * 0.8, coreR = s.torR * 0.12;
                state.particles.push({ x: v.cx + Math.cos(coreA) * coreR, y: v.gy + 10, vx: Math.cos(coreA + Math.PI / 2) * 2, vy: -3 - Math.random() * 2, life: 18, ml: 18, color: s.core, size: 3 + Math.random() * 2, grav: -0.08, type: 'sparkle' });
            }
            // Base debris
            if (t % 5 === 0) {
                for (let k = 0; k < 3; k++) { const da = Math.random() * Math.PI * 2, dd = Math.random() * s.torR * 0.8; state.particles.push({ x: v.cx + Math.cos(da) * dd, y: v.gy + Math.random() * 5, vx: Math.cos(da + Math.PI / 2) * 3, vy: -2 - Math.random() * 4, life: 25, ml: 25, color: ['#886644', '#665533', '#998866', '#554433'][Math.floor(Math.random() * 4)], size: 2 + Math.random() * 3, grav: 0.08, type: 'debris', rot: Math.random() * 6, rotV: (Math.random() - .5) * 0.4 }); }
            }
            // Dynamic light
            state.dynamicLights.push({ x: v.cx, y: v.gy - s.torR * 0.5, r: s.torR * 1.8 + Math.sin(t * 0.15) * 20, color: s.color, int: 0.6 + Math.sin(t * 0.1) * 0.3, life: 2, ml: 2 });
            // Shockwave at base
            if (t % 30 === 0) state.shockwaves.push({ x: v.cx, y: v.gy, r: 0, maxR: s.torR * 0.6, life: 8, maxLife: 8, color: s.c2 });
            // Lift and damage entities
            if (t % 6 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dx = v.cx - (e.x + e.w / 2), dy = v.gy - (e.y + e.h / 2), dist = Math.hypot(dx, dy);
                    if (dist < s.torR * 1.5) {
                        const f = s.torF * (1 - dist / (s.torR * 1.5)) / (e.mass || 1);
                        const ang = Math.atan2(dy, dx);
                        e.vx += Math.cos(ang) * f * 1.5 + Math.cos(ang + Math.PI / 2) * f * 2;
                        e.vy -= Math.abs(f) * 4 + 1.5;
                        hurtEntity(e, s.dmg, v.cx, v.gy);
                    }
                }
            }
            state.shake(2);
            if (t > s.torDur) {
                // Dissipation burst
                spawnP(v.cx, v.gy, s.c2, 20, 'burst');
                spawnP(v.cx, v.gy, s.color, 10, 'explode');
                state.shockwaves.push({ x: v.cx, y: v.gy, r: 0, maxR: s.torR, life: 12, maxLife: 12, color: s.c2 });
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    zephyr_dash(v) {
        const s = v.spell;
        const player = state.player;
        const dashX = Math.cos(v.angle);
        const dashY = Math.sin(v.angle);
        const prevX = player.x + player.w / 2;
        const prevY = player.y + player.h / 2;

        if (v.state === 0) {
            if (v.age === 1) {
                player.castAnim = 280;
                player.castType = 'thrust';
                player.staffGlow = 220;
                SoundFX.playSweep(800, 1300, 'triangle', 0.18, 0.09);
                SoundFX.playNoise(0.12, 0.08, 1800, 'bandpass', 7);
            }
            if (v.age > 3) {
                v.state = 1;
                v.age = 0;
                v.trail.length = 0;
                player.inv = true;
            }
            return;
        }

        if (v.state === 1) {
            const nextX = Math.max(10, Math.min(state.W - player.w - 10, player.x + dashX * s.dashSpeed));
            const nextY = Math.max(18, Math.min(state.H - player.h - 24, player.y + dashY * s.dashSpeed));
            player.x = nextX;
            player.y = nextY;
            player.vx = dashX * 4;
            player.vy = dashY * 4;
            player.onGround = false;

            const cx = player.x + player.w / 2;
            const cy = player.y + player.h / 2;
            v.trail.push({ x: cx, y: cy, life: 10, maxLife: 10 });
            if (v.trail.length > 8) v.trail.shift();

            for (const p of v.trail) p.life -= 1;
            v.trail = v.trail.filter((p) => p.life > 0);

            for (const e of state.entities) {
                if (!e.active || v.hitList.includes(e)) continue;
                const ex = e.x + e.w / 2;
                const ey = e.y + e.h / 2;
                if (distToPath(ex, ey, prevX, prevY, cx, cy) > s.dashR) continue;
                v.hitList.push(e);
                e.vx += dashX * 10 / (e.mass || 1);
                e.vy += dashY * 4 / (e.mass || 1) - 2;
                if (e.rotV !== undefined) e.rotV += (Math.random() - 0.5) * 0.8;
                spawnP(ex, ey, s.core, 5, 'burst');
            }

            if (v.age % 2 === 0) {
                for (let k = 0; k < 3; k++) {
                    state.particles.push({
                        x: cx - dashX * (10 + Math.random() * 14) + (Math.random() - 0.5) * 6,
                        y: cy - dashY * (10 + Math.random() * 14) + (Math.random() - 0.5) * 6,
                        vx: -dashX * (2 + Math.random() * 2) + (Math.random() - 0.5) * 0.8,
                        vy: -dashY * (2 + Math.random() * 2) + (Math.random() - 0.5) * 0.8,
                        life: 16, ml: 16,
                        color: k === 0 ? s.core : s.c2,
                        size: 1.8 + Math.random() * 1.6,
                        grav: -0.01,
                        type: 'trail'
                    });
                }
            }

            state.dynamicLights.push({ x: cx, y: cy, r: 54, color: s.core, int: 0.6, life: 2, ml: 2 });
            state.shake(2);

            if (v.age > s.dashDur) {
                v.state = 2;
                v.age = 0;
                player.inv = false;
                SoundFX.playSweep(900, 280, 'sine', 0.12, 0.08);
            }
            return;
        }

        if (v.state === 2) {
            if (v.age === 1) {
                const cx = player.x + player.w / 2;
                const cy = player.y + player.h / 2;
                state.shockwaves.push({ x: cx, y: cy, r: 0, maxR: 48, life: 8, maxLife: 8, color: s.c2 });
            }
            if (v.age > 8) removeWindVfx(v);
        }
    },

    vacuum_bomb(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Implosion phase
            if (v.age % 2 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dx = v.cx - (e.x + e.w / 2);
                    const dy = v.cy - (e.y + e.h / 2);
                    const d = Math.hypot(dx, dy);
                    if (d < s.vacR) {
                        const pullForce = 0.5 * (1 - d / s.vacR);
                        e.vx += (dx / d) * pullForce;
                        e.vy += (dy / d) * pullForce;
                    }
                }
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * s.vacR * 0.5;
                spawnP(v.cx + Math.cos(angle) * dist, v.cy + Math.sin(angle) * dist, s.color, 2, 'trail');
            }
            if (v.age >= v.spell.vacDur) v.state = 1;
        } else if (v.state === 1) {
            // Detonation phase
            if (v.age === 1) {
                explode(v.cx, v.cy, s.vacR * 0.8, 15, 30, s.color, s.c2);
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.vacR * 0.8, life: 12, maxLife: 12, color: s.c2 });
                state.shake(15);
                for (let i = 0; i < 30; i++) {
                    const a = (i / 30) * Math.PI * 2;
                    spawnP(v.cx + Math.cos(a) * s.vacR * 0.5, v.cy + Math.sin(a) * s.vacR * 0.5, s.color, 3, 'burst');
                }
            }
            if (v.age > 15) removeWindVfx(v);
        }
    },

    sonic_boom(v) {
        const s = v.spell;
        if (v.age > 12) removeWindVfx(v);
    }
};

// ── VFX Darwers ────────────────────────────────────────────────────────────
export const VFX_DRAW = {
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    cyclone_blades(v, X) {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        const bladeCount = s.bladeCount || 4;
        // Draw orbit ring
        X.strokeStyle = s.c2;
        X.lineWidth = 1;
        X.globalAlpha = 0.2;
        X.beginPath();
        X.arc(px, py, s.orbitR, 0, Math.PI * 2);
        X.stroke();
        // Draw blades
        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2 + v.age * 0.12;
            const bx = px + Math.cos(angle) * s.orbitR;
            const by = py + Math.sin(angle) * s.orbitR;
            X.save();
            X.translate(bx, by);
            X.rotate(angle + Math.PI / 2);
            // Crescent blade shape
            const grad = X.createLinearGradient(-8, 0, 8, 0);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.3, s.color);
            grad.addColorStop(0.5, s.core);
            grad.addColorStop(0.7, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.85;
            X.beginPath();
            X.moveTo(-10, -3);
            X.quadraticCurveTo(0, -8, 10, -3);
            X.quadraticCurveTo(0, 3, -10, -3);
            X.fill();
            X.restore();
        }
        X.globalAlpha = 1;
    },
    vacuum_bomb(v, X) {
        const s = v.spell;
        if (v.state === 0) {
            const rad = s.vacR * (1 - v.age / s.vacDur);
            const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, rad);
            grad.addColorStop(0, s.core);
            grad.addColorStop(0.4, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.6 * (1 - v.age / s.vacDur);
            X.beginPath();
            X.arc(v.cx, v.cy, rad, 0, Math.PI * 2);
            X.fill();
        } else if (v.state === 1) {
            X.fillStyle = s.core;
            X.globalAlpha = Math.max(0, 1 - v.age / 15);
            X.beginPath();
            X.arc(v.cx, v.cy, s.vacR * 0.8, 0, Math.PI * 2);
            X.fill();
        }
        X.globalAlpha = 1;
    },
    sonic_boom(v, X) {
        const s = v.spell;
        const progress = Math.min(1, v.age / 12);
        const radius = s.boomR * progress;
        X.strokeStyle = s.color;
        X.lineWidth = 3 * (1 - progress);
        X.globalAlpha = 1 - progress;
        X.beginPath();
        X.arc(v.cx, v.cy, radius, -v.angle - s.boomAngle, -v.angle + s.boomAngle);
        X.stroke();
        X.globalAlpha = 1;
    },
    zephyr_dash(v, X) {
        const s = v.spell;
        const player = state.player;
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        X.save();

        // ── Trail Ghosts (Additive Blend) ──
        X.globalCompositeOperation = 'lighter';
        for (let i = 0; i < (v.trail?.length || 0); i++) {
            const p = v.trail[i];
            const alpha = (p.life / p.maxLife) * 0.45;
            X.globalAlpha = alpha;

            // Premium Radial Gradient for each ghost
            const g = X.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22 - i);
            g.addColorStop(0, s.core);
            g.addColorStop(0.3, s.c2 + 'aa');
            g.addColorStop(1, 'transparent');

            X.fillStyle = g;
            X.beginPath();
            X.ellipse(p.x, p.y, 20 - i * 1.5, 9 - i * 0.6, v.angle, 0, Math.PI * 2);
            X.fill();
        }

        // ── Main Dash Gust (Ethereal Plasma Effect) ──
        if (v.state === 1) {
            X.translate(cx, cy);
            X.rotate(v.angle);

            const gust = X.createLinearGradient(-45, 0, 50, 0);
            gust.addColorStop(0, 'transparent');
            gust.addColorStop(0.2, s.c2 + '33');
            gust.addColorStop(0.5, s.core + '99');
            gust.addColorStop(0.8, s.c2 + '33');
            gust.addColorStop(1, 'transparent');

            X.globalAlpha = 0.8;
            X.fillStyle = gust;
            X.beginPath();
            X.moveTo(-40, -12);
            X.quadraticCurveTo(-10, -22, 45, 0);
            X.quadraticCurveTo(-10, 22, -40, 12);
            X.closePath();
            X.fill();

            // Inner "Energy Strings"
            X.globalAlpha = 0.5;
            X.strokeStyle = s.core;
            X.lineWidth = 1.5;
            X.setLineDash([15, 10]);
            X.beginPath();
            X.moveTo(-36, -5);
            X.quadraticCurveTo(8, -16, 40, -1);
            X.stroke();
            X.beginPath();
            X.moveTo(-34, 6);
            X.quadraticCurveTo(6, 16, 38, 2);
            X.stroke();
            X.setLineDash([]);
        }
        X.restore();
        X.globalAlpha = 1;
    },
    updraft(v, X) {
        if (v.state === 0 && v.gy) {
            const pr = v.age / 20;
            X.fillStyle = v.spell.color;
            X.globalAlpha = 0.3 + Math.random() * 0.2;
            X.beginPath();
            X.ellipse(v.tx, v.gy, 60 * pr, 15 * pr, 0, 0, Math.PI * 2);
            X.fill();
            X.globalAlpha = 1;
        }
    }
};
