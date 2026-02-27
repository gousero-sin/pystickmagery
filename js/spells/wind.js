// wind.js — Wind & Air Spells Module
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
    { name: 'Wind Blast', icon: '💨', key: '8', color: '#99ddbb', c2: '#cceecc', core: '#eeffee', speed: 0, dmg: 8, mana: 14, cd: 350, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isWind: true, windR: 180, windF: 25, desc: 'Massive knockback push' },
    { name: 'Air Blade', icon: '🗡️', key: 'T', color: '#ddffee', c2: '#ffffff', core: '#aaffcc', speed: 22, dmg: 18, mana: 10, cd: 200, r: 4, grav: 0, drag: 1, bounce: 0, trail: 'wind', isAirBlade: true, piercing: true, desc: 'High-speed piercing wind cutter' },
    { name: 'Updraft', icon: '🌪️', key: 'Y', color: '#ccffee', c2: '#eeffff', core: '#aaddbb', speed: 0, dmg: 15, mana: 20, cd: 600, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isUpdraft: true, desc: 'Launches enemies high into the air' },
    { name: 'Tornado', icon: '🌪️', key: 'U', color: '#88aacc', c2: '#aaccee', core: '#ddeeff', speed: 0, dmg: 6, mana: 30, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isTornado: true, torDur: 250, torR: 65, torF: 1.2, desc: 'Moving vortex lifts objects' },
    { name: 'Zephyr Dash', icon: '🪽', key: 'O', color: '#b9fff1', c2: '#e8ffff', core: '#ffffff', speed: 0, dmg: 22, mana: 18, cd: 950, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'wind', isZephyrDash: true, dashDur: 12, dashSpeed: 28, dashR: 34, desc: 'Launches the caster in a slicing gust that damages everything in the lane' },
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
    ...MANIFEST_VFX_UPDATE,
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
                player.castAnim = 180;
                player.castType = 'thrust';
                player.staffGlow = 220;
                SoundFX.playSweep(600, 1300, 'triangle', 0.18, 0.09);
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
                hurtEntity(e, s.dmg, cx, cy);
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
    }
};

// ── VFX Darwers ────────────────────────────────────────────────────────────
export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW,
    zephyr_dash(v, X) {
        const s = v.spell;
        const player = state.player;
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        X.save();
        for (let i = 0; i < (v.trail?.length || 0); i++) {
            const p = v.trail[i];
            const alpha = (p.life / p.maxLife) * 0.32;
            X.globalAlpha = alpha;
            X.fillStyle = s.c2;
            X.beginPath();
            X.ellipse(p.x, p.y, 18 - i * 1.8, 8 - i * 0.7, v.angle, 0, Math.PI * 2);
            X.fill();
        }

        if (v.state === 1) {
            X.translate(cx, cy);
            X.rotate(v.angle);
            const gust = X.createLinearGradient(-40, 0, 46, 0);
            gust.addColorStop(0, 'transparent');
            gust.addColorStop(0.35, s.c2);
            gust.addColorStop(1, s.core);
            X.globalAlpha = 0.7;
            X.fillStyle = gust;
            X.beginPath();
            X.moveTo(-38, -10);
            X.quadraticCurveTo(-8, -20, 42, 0);
            X.quadraticCurveTo(-8, 20, -38, 10);
            X.closePath();
            X.fill();
            X.globalAlpha = 0.4;
            X.strokeStyle = s.core;
            X.lineWidth = 2;
            X.beginPath();
            X.moveTo(-34, -4);
            X.quadraticCurveTo(6, -14, 38, -1);
            X.stroke();
            X.beginPath();
            X.moveTo(-32, 5);
            X.quadraticCurveTo(4, 14, 36, 2);
            X.stroke();
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
