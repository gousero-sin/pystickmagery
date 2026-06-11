// fire.js — Fire & Heat Spells Module
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, explode, isEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
    { name: 'Fireball', icon: '🔥', key: '1', color: '#ff5511', c2: '#ff9b35', core: '#fff2a6', speed: 7.4, dmg: 22, mana: 12, cd: 300, r: 6, grav: .13, drag: .997, bounce: 0, exR: 48, exF: 8, trail: 'fire', desc: 'Weighted ember orb with a layered blast bloom' },
    { name: 'Meteor', icon: '☄️', key: '6', color: '#ff6600', c2: '#ffb13a', core: '#fff0a8', speed: 0, dmg: 45, mana: 40, cd: 1500, r: 12, grav: .5, drag: .999, bounce: 0, exR: 74, exF: 14, trail: 'meteor', isMeteor: true, desc: 'Telegraphed skyfall with a bright ground omen' },
    { name: 'Phoenix Step', icon: '🪶', key: 'T', category: 'Dash', color: '#ff4a1d', c2: '#ffb84f', core: '#fff3c2', speed: 0, dmg: 0, mana: 18, cd: 780, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isPhoenixStep: true, dashDur: 12, dashSpeed: 25, slowFallDur: 44, desc: 'Cinder recoil dash that sheds smoke and grants brief slow-fall' },
    createHoldSpell({
        name: 'Kiln Arc', icon: '🏺', key: 'A',
        color: '#ff641f', c2: '#ffb05a', core: '#fff0b6',
        mana: 18, cd: 900, dmg: 4,
        holdStyle: 'fire', holdProfile: 'fire_kiln',
        holdWidth: 26, holdR: 90, holdDrain: 0.24, holdLift: 0.48, holdDealsDamage: true,
        releaseR: 84, releaseDmg: 22,
        desc: 'Hold to keep a smoldering ribbon hot until it collapses in cinder bursts'
    }),
    { name: 'Cataclysm', icon: '🌋', key: 'V', color: '#ff2200', c2: '#ff8800', core: '#ffcc00', speed: 0, dmg: 120, mana: 80, cd: 8000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isCataclysm: true, exR: 150, exF: 25, desc: 'Massive eruption (Ultimate)' }
];

function removeFireVfx(v) {
    const idx = state.vfxSequences.indexOf(v);
    if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function emitFireTrail(p, s, intensity = 1) {
    const glow = Math.max(1, Math.floor(1 + intensity));
    if (p.age % 2 === 0) {
        spawnP(p.x + (Math.random() - .5) * 8, p.y + (Math.random() - .5) * 8, Math.random() > .45 ? s.c2 : s.core, glow, 'ember');
    }
    if (p.age % 5 === 0) {
        state.dynamicLights.push({ x: p.x, y: p.y, r: 34 + (p.growR || s.r || 4) * 4, color: s.c2 || s.color, int: 0.65 + intensity * 0.25, life: 4, ml: 4 });
    }
    return false;
}

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
    ...HOLD_FIRE_HANDLERS,
    ...MANIFEST_FIRE_HANDLERS,
    isMeteor(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'meteor', state: 0, age: 0, tx, ty, spell: s });
        spawnP(ox, oy, s.color, 12, 'burst');
        return true;
    },
    isWall(s, ox, oy, tx, ty) {
        // Find ground level beneath target
        let gy = state.H - 24;
        for (const p of state.platforms || []) {
            if (tx > p.x && tx < p.x + p.w && ty <= p.y) gy = Math.min(gy, p.y);
        }
        const pillarCount = 5;
        const totalW = s.wallW;
        const step = totalW / (pillarCount - 1);
        for (let k = 0; k < pillarCount; k++) {
            const px = tx - totalW / 2 + k * step + (Math.random() - 0.5) * 6;
            const pw = 30 + Math.random() * 14;
            const ph = s.wallH + (Math.random() - 0.5) * 10 + (k === 2 ? 14 : 0);
            state.fireWalls.push({
                x: px - pw / 2, y: gy - ph,
                w: pw, h: ph,
                dur: s.wallDur + Math.floor((Math.random() - 0.5) * 40),
                maxDur: s.wallDur,
                dmg: s.dmg,
                color: s.color, c2: s.c2,
                seed: Math.random() * 100,
                wob: Math.random() * Math.PI * 2,
            });
        }
        state.vfxSequences.push({ type: 'firewall_bloom', state: 0, age: 0, tx, ty: gy, spell: s });
        state.shockwaves.push({ x: tx, y: gy, r: 0, maxR: totalW * 0.6, life: 18, maxLife: 18, color: s.c2 });
        state.dynamicLights.push({ x: tx, y: gy - s.wallH / 2, r: totalW * 1.2, color: s.color, int: 2.4, life: 18, ml: 18 });
        SoundFX.playNoise(0.55, 0.45, 280, 'lowpass');
        SoundFX.playSweep(420, 120, 'sawtooth', 0.35, 0.28);
        state.shake(6);
        spawnP(tx, gy, s.core, 18, 'burst');
        spawnP(tx, gy, s.c2, 24, 'ember');
        return true;
    },
    isCataclysm(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'cataclysm', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, tx, ty, spell: s });
        state.player.inv = true;
        return true;
    },
    isBackdraft(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'backdraft', state: 0, age: 0, tx, ty, spell: s });
        SoundFX.playTone(80, 'sine', 0.3, 0.4);
        return true;
    },
    isPhoenixStep(s, ox, oy, tx, ty) {
        const player = state.player;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const angle = Math.atan2(ty - py, tx - px);
        state.vfxSequences.push({
            type: 'phoenix_step',
            state: 0,
            age: 0,
            angle,
            spell: s,
            trail: [],
            pushed: new Set(),
        });
        player.castAnim = 240;
        player.castType = 'front_pose';
        SoundFX.playSweep(260, 980, 'sawtooth', 0.22, 0.16);
        spawnP(px, py, s.c2, 12, 'ember');
        return true;
    },
    isPyroblast(s, ox, oy, tx, ty) {
        const existing = state.vfxSequences.find(v => v.type === 'pyroblast_charge' && v.state === 0);
        if (existing) {
            // Release charged blast
            existing.state = 1;
            existing.age = 0;
            existing.tx = tx;
            existing.ty = ty;
        } else {
            // Start charging
            state.vfxSequences.push({ type: 'pyroblast_charge', state: 0, age: 0, spell: s, chargeTime: 0 });
            SoundFX.playSweep(200, 600, 'sine', 0.3, 0.3);
        }
        return true;
    }
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
export const PROJ_HOOKS = {
    isCluster: {
        onUpdate(p, s) {
            return emitFireTrail(p, s, p.subProj ? 0.55 : 1);
        },
        onLand(p, s, hitPlat, hitEntity) {
            for (let k = 0; k < s.subCount; k++) {
                const a = k / s.subCount * Math.PI * 2;
                state.projectiles.push(createPlayerProjectile({
                    x: p.x, y: p.y, vx: Math.cos(a) * s.subSpd, vy: Math.sin(a) * s.subSpd - 2, spell: { ...s, isCluster: false, _hook: null }, life: 100, age: 0, trail: [], hitList: [], bounces: 2, subProj: true, growR: s.subR, growDmg: s.subDmg
                }));
            }
        }
    },
    isTimeBomb: {
        onUpdate(p, s) {
            if (p.age % 10 === 0) SoundFX.playTone(360 + (p.age % 30) * 7, 'triangle', 0.025, 0.04);
            return emitFireTrail(p, s, 0.75);
        },
        onLand(p, s, hitPlat, hitEntity) {
            state.vfxSequences.push({
                type: 'timebomb',
                state: 0,
                age: 0,
                cx: p.x,
                cy: p.y,
                spell: s,
                stuckTo: hitEntity || null,
                offset: hitEntity ? { x: p.x - hitEntity.x, y: p.y - hitEntity.y } : null,
            });
            return true;
        }
    },
    isIgniteChain: {
        onUpdate(p, s) {
            if (p.age % 3 === 0) {
                state.lightningBolts.push({
                    segments: [
                        { x: p.x - p.vx * 2, y: p.y - p.vy * 2 },
                        { x: p.x + (Math.random() - .5) * 16, y: p.y + (Math.random() - .5) * 16 },
                        { x: p.x, y: p.y },
                    ],
                    life: 8,
                    color: s.c2,
                    width: 1.4,
                });
            }
            return emitFireTrail(p, s, 0.85);
        },
        onLand(p, s, hitPlat, hitEntity) {
            if (hitEntity) {
                // Find closest active entity within chainR that isn't hitEntity
                let closest = null, minDist = s.chainR;
                for (const e of state.entities) {
                    if (!isEnemyEntity(e) || e === hitEntity) continue;
                    const d = Math.hypot(e.x + e.w / 2 - p.x, e.y + e.h / 2 - p.y);
                    if (d < minDist) { minDist = d; closest = e; }
                }
                if (closest) {
                    // Create lightning chain effect
                    spawnP(p.x, p.y, s.color, 8, 'burst');
                    spawnP(closest.x + closest.w / 2, closest.y + closest.h / 2, s.color, 8, 'burst');
                    // Launch projectile to next target
                    const nextSpell = { ...s, isIgniteChain: true, _hook: s._hook || PROJ_HOOKS.isIgniteChain, chainCount: (s.chainCount || 1) - 1 };
                    if (nextSpell.chainCount > 0) {
                        state.projectiles.push(createPlayerProjectile({
                            x: p.x, y: p.y,
                            vx: (closest.x + closest.w / 2 - p.x) * 0.1,
                            vy: (closest.y + closest.h / 2 - p.y) * 0.1,
                            spell: nextSpell,
                            life: 150, age: 0, trail: [], hitList: [hitEntity], bounces: 0
                        }));
                    }
                }
            }
        }
    },
    fire: {
        onUpdate(p, s) {
            return emitFireTrail(p, s, s.isPyroblast ? 1.4 : 1);
        },
    },
    isPyroblastProj: {
        onUpdate(p, s) {
            // Heavy fiery trail
            emitFireTrail(p, s, 1.8);
            if (p.age % 3 === 0) {
                spawnP(p.x + (Math.random() - 0.5) * 6, p.y + (Math.random() - 0.5) * 6, s.core, 1, 'sparkle');
            }
            return false;
        },
        onLand(p, s, hitPlat, hitEntity) {
            const cx = p.x, cy = p.y;
            const chargeP = s.chargeP || 0;
            // Find ground beneath impact for fire walls
            let gy = state.H - 24;
            for (const pl of state.platforms || []) {
                if (cx > pl.x && cx < pl.x + pl.w && cy <= pl.y + 20) gy = Math.min(gy, pl.y);
            }
            // Barrel-class detonation
            state.shockwaves.push({ x: cx, y: cy, r: 0, maxR: s.exR * 1.6, life: 22, maxLife: 22, color: '#ffe69a' });
            state.shockwaves.push({ x: cx, y: cy, r: 0, maxR: s.exR * 1.0, life: 14, maxLife: 14, color: s.color });
            state.dynamicLights.push({ x: cx, y: cy, r: 240, color: '#ffffff', int: 4 + chargeP * 2, life: 10, ml: 10 });
            state.dynamicLights.push({ x: cx, y: cy, r: 160, color: s.color, int: 3, life: 18, ml: 18 });
            spawnP(cx, cy, '#ffffff', 24, 'burst');
            spawnP(cx, cy, s.core, 30, 'sparkle');
            spawnP(cx, cy, s.color, 44, 'explode');
            spawnP(cx, cy, s.c2, 32, 'ember');
            // Smoke column
            for (let k = 0; k < 22; k++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
                const spd = 1 + Math.random() * 2.4;
                state.particles.push({
                    x: cx + (Math.random() - 0.5) * 14,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 1.1,
                    life: 80 + Math.random() * 40, ml: 120,
                    color: '#3a2818', size: 5 + Math.random() * 5,
                    grav: -0.035, type: 'smoke',
                });
            }
            // Persistent fire walls (mirroring barrel detonation)
            const ring = 4 + Math.floor(chargeP * 3);
            for (let i = 0; i < ring; i++) {
                const a = (i / ring) * Math.PI * 2 + Math.random() * 0.4;
                const dist = 24 + Math.random() * 22;
                const fwx = cx + Math.cos(a) * dist;
                const fwy = Math.min(state.H - 52, Math.max(40, gy - 32 + Math.random() * 4));
                state.fireWalls.push({
                    x: fwx - 24, y: fwy,
                    w: 36 + Math.random() * 22,
                    h: 32 + Math.random() * 6,
                    dur: 150 + Math.random() * 90, maxDur: 240,
                    dmg: 3 + Math.floor(chargeP * 4),
                    color: s.color, c2: s.c2,
                    seed: Math.random() * 100,
                    wob: Math.random() * Math.PI * 2,
                });
            }
            explode(cx, cy, s.exR, s.exF, s.dmg, s.color, s.c2);
            SoundFX.playNoise(0.95, 0.55, 90, 'lowpass');
            SoundFX.playSweep(620, 180, 'sawtooth', 0.5 + chargeP * 0.3, 0.35);
            SoundFX.playTone(220, 'triangle', 0.35, 0.25);
            state.shake(14 + chargeP * 10);
            return true;
        },
    }
};

// ── VFX Updaters ───────────────────────────────────────────────────────────
// meteor, firewall, cataclysm are handled inline in arcane-modular.html
export const VFX_UPDATE = {
    ...HOLD_VFX_UPDATE,
    ...MANIFEST_VFX_UPDATE,
    phoenix_step(v) {
        const s = v.spell;
        const player = state.player;
        const dx = Math.cos(v.angle);
        const dy = Math.sin(v.angle);
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;

        if (v.state === 0) {
            player.castAnim = 220;
            player.castType = 'front_pose';
            player.vx *= 0.72;
            player.vy *= 0.72;
            if (v.age % 2 === 0) {
                spawnP(cx - dx * 8, cy + 8, s.color, 3, 'ember');
                spawnP(cx - dx * 14, cy + 12, '#332018', 2, 'smoke');
            }
            state.dynamicLights.push({ x: cx, y: cy, r: 58, color: s.c2, int: 1.1, life: 2, ml: 2 });
            if (v.age > 4) {
                v.state = 1;
                v.age = 0;
                v.trail.length = 0;
                player.inv = true;
                SoundFX.playNoise(0.18, 0.1, 620, 'bandpass', 4);
            }
            return;
        }

        if (v.state === 1) {
            player.x = clamp(player.x + dx * s.dashSpeed, 10, state.W - player.w - 10);
            player.y = clamp(player.y + dy * s.dashSpeed * 0.55 - 0.9, 18, state.H - player.h - 24);
            player.vx = dx * 4.6;
            player.vy = dy * 2.4 - 1.2;
            player.onGround = false;

            const nx = player.x + player.w / 2;
            const ny = player.y + player.h / 2;
            v.trail.push({ x: nx, y: ny, life: 16, maxLife: 16 });
            if (v.trail.length > 9) v.trail.shift();
            for (const t of v.trail) t.life -= 1;

            for (const e of state.entities) {
                if (!isEnemyEntity(e) || v.pushed.has(e)) continue;
                const ex = e.x + e.w / 2;
                const ey = e.y + e.h / 2;
                if (Math.hypot(ex - nx, ey - ny) > 34) continue;
                v.pushed.add(e);
                e.vx += dx * 7 / (e.mass || 1);
                e.vy += dy * 2 / (e.mass || 1) - 2.2;
                spawnP(ex, ey, s.c2, 5, 'ember');
            }

            if (v.age % 2 === 0) {
                spawnP(nx - dx * 12, ny + 4, s.c2, 2, 'ember');
                spawnP(nx - dx * 18, ny + 9, '#3b2518', 1, 'smoke');
            }
            state.dynamicLights.push({ x: nx, y: ny, r: 68, color: s.core, int: 1.35, life: 2, ml: 2 });
            if (v.age > s.dashDur) {
                v.state = 2;
                v.age = 0;
                player.inv = false;
                player.phoenixSlowFallFrames = s.slowFallDur || 44;
                state.shockwaves.push({ x: nx, y: ny, r: 0, maxR: 52, life: 10, maxLife: 10, color: s.c2 });
                SoundFX.playSweep(900, 260, 'triangle', 0.12, 0.1);
            }
            return;
        }

        if (v.state === 2) {
            if (player.vy > 0) player.vy *= 0.86;
            player.phoenixSlowFallFrames = Math.max(player.phoenixSlowFallFrames || 0, Math.max(1, (s.slowFallDur || 44) - v.age));
            if (v.age % 4 === 0) spawnP(player.x + player.w / 2, player.y + player.h, s.c2, 1, 'ember');
            if (v.age > (s.slowFallDur || 44)) removeFireVfx(v);
        }
    },
    firewall_bloom(v) {
        const s = v.spell;
        // Quick bloom of embers + smoke licking up over the pillar line
        if (v.age % 2 === 0) {
            const px = v.tx + (Math.random() - 0.5) * s.wallW;
            state.particles.push({
                x: px, y: v.ty - Math.random() * 10,
                vx: (Math.random() - 0.5) * 1.4,
                vy: -2.4 - Math.random() * 2.2,
                life: 26 + Math.random() * 12, ml: 38,
                color: Math.random() > 0.35 ? s.core : s.c2,
                size: 1.8 + Math.random() * 2.2, grav: -0.05, type: 'ember',
            });
        }
        if (v.age % 4 === 0) {
            const px = v.tx + (Math.random() - 0.5) * s.wallW;
            state.particles.push({
                x: px, y: v.ty - s.wallH * 0.4,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -0.4 - Math.random() * 0.9,
                life: 70 + Math.random() * 30, ml: 100,
                color: '#3a2818', size: 5 + Math.random() * 3,
                grav: -0.03, type: 'smoke',
            });
        }
        if (v.age > 30) removeFireVfx(v);
    },
    pyroblast_charge(v) {
        const s = v.spell;
        const px = state.player.x + state.player.w / 2;
        const py = state.player.y + state.player.h / 2;
        if (v.state === 0) {
            // Charging phase
            v.chargeTime = Math.min(v.age, s.maxCharge);
            v.cx = px;
            v.cy = py - 25;
            state.player.castAnim = 280;
            state.player.castType = 'up';
            state.player.staffGlow = 280;
            // Growing ember particles
            const chargeP = v.chargeTime / s.maxCharge;
            if (v.age % Math.max(1, Math.floor(4 - chargeP * 3)) === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = 30 + chargeP * 20;
                state.particles.push({
                    x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r,
                    vx: -Math.cos(a) * (3 + chargeP * 4), vy: -Math.sin(a) * (3 + chargeP * 4),
                    life: 12, ml: 12, color: chargeP > 0.7 ? s.core : s.color,
                    size: 2 + chargeP * 3, grav: 0, type: 'ember'
                });
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: 30 + chargeP * 50, color: s.color, int: 1 + chargeP * 2, life: 2, ml: 2 });
            if (v.age % 20 === 0) SoundFX.playTone(300 + chargeP * 600, 'sine', 0.1 + chargeP * 0.2, 0.15);
            state.shake(chargeP * 2);
            // Auto-release at max charge
            if (v.chargeTime >= s.maxCharge) {
                v.state = 1; v.age = 0;
                // Release toward facing direction
                const facing = state.player.facing || 1;
                v.tx = px + facing * 200;
                v.ty = py;
            }
        } else if (v.state === 1) {
            // Release — spawn scaled projectile
            if (v.age === 1) {
                const chargeP = v.chargeTime / s.maxCharge;
                const angle = Math.atan2(v.ty - (state.player.y + state.player.h / 2), v.tx - (state.player.x + state.player.w / 2));
                const projSpeed = 8 + chargeP * 8;
                const projDmg = Math.floor(s.dmg + chargeP * s.dmg * 3);
                const projR = 5 + Math.floor(chargeP * 10);
                const exR = 40 + Math.floor(chargeP * 60);
                const exF = 8 + Math.floor(chargeP * 12);
                const pyroProjSpell = {
                    ...s, isPyroblast: false, isPyroblastProj: true,
                    speed: projSpeed, dmg: projDmg, r: projR, exR, exF,
                    grav: 0.05, drag: 0.999, trail: 'fire', chargeP,
                };
                pyroProjSpell._hook = PROJ_HOOKS.isPyroblastProj;
                state.projectiles.push(createPlayerProjectile({
                    x: state.player.x + state.player.w / 2,
                    y: state.player.y + state.player.h / 2,
                    vx: Math.cos(angle) * projSpeed,
                    vy: Math.sin(angle) * projSpeed,
                    spell: pyroProjSpell,
                    life: 300, age: 0, trail: [], hitList: [], bounces: 0,
                    growR: projR, growDmg: projDmg,
                }));
                SoundFX.playSweep(400, 1200, 'sawtooth', 0.5 + chargeP * 0.5, 0.3);
                SoundFX.playNoise(0.4, 0.2, 600, 'bandpass');
                state.shake(5 + chargeP * 10);
                spawnP(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, s.core, 15, 'burst');
                state.shockwaves.push({ x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2, r: 0, maxR: 40, life: 6, maxLife: 6, color: s.c2 });
            }
            if (v.age > 5) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx !== -1) state.vfxSequences.splice(idx, 1);
            }
        }
    },
    backdraft(v) {
        const s = v.spell;
        try {
            if (v.state === 0) {
                // Inhale: oxygen-starved heat pocket, particles drawn inward
                if (v.age % 3 === 0) {
                    const a = Math.random() * Math.PI * 2;
                    const r0 = s.bdR * (0.5 + 0.5 * Math.random());
                    state.particles.push({
                        x: v.tx + Math.cos(a) * r0,
                        y: v.ty + Math.sin(a) * r0,
                        vx: -Math.cos(a) * (1.4 + Math.random() * 1.6),
                        vy: -Math.sin(a) * (1.4 + Math.random() * 1.6),
                        life: 24, ml: 24,
                        color: Math.random() > 0.5 ? s.c2 : s.core,
                        size: 1.5 + Math.random() * 2,
                        grav: 0, type: 'sparkle',
                    });
                }
                state.dynamicLights.push({ x: v.tx, y: v.ty, r: 30 + Math.sin(v.age * 0.12) * 12, color: s.color, int: 1.4 + Math.sin(v.age * 0.18) * 0.4, life: 2, ml: 2 });
                if (v.age % 14 === 0) SoundFX.playTone(120 + (v.age / s.bdDelay) * 280, 'sine', 0.05, 0.12);
                if (v.age >= s.bdDelay) { v.state = 1; v.age = 0; }
            } else if (v.state === 1) {
                // Compress: pull enemies into the heat pocket
                if (v.age === 1) SoundFX.playNoise(0.3, 0.18, 700, 'highpass');
                for (const e of state.entities) {
                    if (!e || !e.active || !isEnemyEntity(e)) continue;
                    if (typeof e.x !== 'number' || typeof e.w !== 'number') continue;
                    const dx = v.tx - (e.x + e.w / 2);
                    const dy = v.ty - (e.y + e.h / 2);
                    const d = Math.hypot(dx, dy);
                    if (d < s.bdR && d > 0.1) {
                        const pull = 0.9 * (1 - d / s.bdR);
                        e.vx += (dx / d) * pull;
                        e.vy += (dy / d) * pull - 0.15;
                    }
                }
                if (v.age % 2 === 0) {
                    const a = Math.random() * Math.PI * 2;
                    const dist = s.bdR * (0.4 + Math.random() * 0.4);
                    state.particles.push({
                        x: v.tx + Math.cos(a) * dist,
                        y: v.ty + Math.sin(a) * dist,
                        vx: -Math.cos(a) * 4,
                        vy: -Math.sin(a) * 4,
                        life: 14, ml: 14,
                        color: s.color, size: 2.4, grav: 0, type: 'trail',
                    });
                }
                state.dynamicLights.push({ x: v.tx, y: v.ty, r: 60 + v.age * 2, color: s.color, int: 2.2, life: 2, ml: 2 });
                if (v.age >= 22) { v.state = 2; v.age = 0; }
            } else if (v.state === 2) {
                // Detonate: barrel-class flame burst with persistent fire walls
                if (v.age === 1) {
                    // Find ground for fire walls
                    let gy = state.H - 24;
                    for (const p of state.platforms || []) {
                        if (v.tx > p.x && v.tx < p.x + p.w && v.ty <= p.y + 20) gy = Math.min(gy, p.y);
                    }
                    explode(v.tx, v.ty, s.bdR, 22, s.dmg, s.color, s.c2);
                    state.shake(20);
                    for (let i = 0; i < 3; i++) {
                        state.shockwaves.push({ x: v.tx, y: v.ty, r: 0, maxR: s.bdR * (0.7 + i * 0.25), life: 14 + i * 4, maxLife: 14 + i * 4, color: i % 2 ? s.core : s.c2 });
                    }
                    state.dynamicLights.push({ x: v.tx, y: v.ty, r: 240, color: '#ffffff', int: 5, life: 9, ml: 9 });
                    state.dynamicLights.push({ x: v.tx, y: v.ty, r: 160, color: s.color, int: 3.4, life: 18, ml: 18 });
                    // Persistent fire walls (barrel-style)
                    const ring = 6;
                    for (let i = 0; i < ring; i++) {
                        const a = (i / ring) * Math.PI * 2 + Math.random() * 0.4;
                        const dist = 26 + Math.random() * 22;
                        const fwx = v.tx + Math.cos(a) * dist;
                        const fwy = Math.min(state.H - 52, Math.max(40, v.ty + Math.sin(a) * dist * 0.4 + 4));
                        state.fireWalls.push({
                            x: fwx - 24, y: fwy,
                            w: 36 + Math.random() * 22,
                            h: 32 + Math.random() * 6,
                            dur: 160 + Math.random() * 90, maxDur: 240,
                            dmg: 3,
                            color: s.color, c2: s.c2,
                            seed: Math.random() * 100,
                            wob: Math.random() * Math.PI * 2,
                        });
                    }
                    spawnP(v.tx, v.ty, '#ffffff', 26, 'burst');
                    spawnP(v.tx, v.ty, s.core, 30, 'sparkle');
                    spawnP(v.tx, v.ty, s.color, 42, 'explode');
                    spawnP(v.tx, v.ty, s.c2, 30, 'ember');
                    SoundFX.playNoise(1.0, 0.55, 90, 'lowpass');
                    SoundFX.playSweep(720, 200, 'sawtooth', 0.55, 0.35);
                }
                if (v.age > 18) removeFireVfx(v);
            }
        } catch (err) {
            // Self-heal: any crash inside backdraft removes the sequence
            console.warn('[backdraft]', err);
            removeFireVfx(v);
        }
    }
};

// ── VFX Drawers ────────────────────────────────────────────────────────────
export const VFX_DRAW = {
    ...HOLD_VFX_DRAW,
    ...MANIFEST_VFX_DRAW,
    phoenix_step(v, X) {
        const s = v.spell;
        const player = state.player;
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        const fade = v.state === 2 ? Math.max(0, 1 - v.age / (s.slowFallDur || 44)) : 1;

        X.save();
        X.globalCompositeOperation = 'lighter';
        for (let i = 0; i < (v.trail?.length || 0); i++) {
            const p = v.trail[i];
            const a = (p.life / p.maxLife) * 0.5;
            const g = X.createRadialGradient(p.x, p.y, 0, p.x, p.y, 28 - i);
            g.addColorStop(0, s.core);
            g.addColorStop(0.35, s.c2);
            g.addColorStop(1, 'transparent');
            X.fillStyle = g;
            X.globalAlpha = a;
            X.beginPath();
            X.ellipse(p.x, p.y + 4, 24 - i * 1.4, 10 - i * 0.4, v.angle, 0, Math.PI * 2);
            X.fill();
        }

        X.translate(cx, cy + 4);
        X.rotate(v.angle);
        X.globalAlpha = 0.58 * fade;
        const wing = X.createLinearGradient(-30, 0, 24, 0);
        wing.addColorStop(0, 'transparent');
        wing.addColorStop(0.3, s.color);
        wing.addColorStop(0.65, s.c2);
        wing.addColorStop(1, s.core);
        X.fillStyle = wing;
        X.beginPath();
        X.moveTo(-26, -11);
        X.quadraticCurveTo(-2, -28, 34, -4);
        X.quadraticCurveTo(4, -8, -26, 3);
        X.closePath();
        X.fill();
        X.beginPath();
        X.moveTo(-26, 11);
        X.quadraticCurveTo(-2, 28, 34, 4);
        X.quadraticCurveTo(4, 8, -26, -3);
        X.closePath();
        X.fill();
        X.restore();
        X.globalAlpha = 1;
    },
    pyroblast_charge(v, X) {
        const s = v.spell;
        if (v.state === 0) {
            const chargeP = v.chargeTime / s.maxCharge;
            const r = 8 + chargeP * 16;
            // Glowing fireball growing above player
            const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, r);
            grad.addColorStop(0, s.core);
            grad.addColorStop(0.3, s.c2);
            grad.addColorStop(0.7, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.8 + chargeP * 0.2;
            X.beginPath();
            X.arc(v.cx, v.cy, r, 0, Math.PI * 2);
            X.fill();
            // Charge ring
            X.strokeStyle = s.core;
            X.lineWidth = 2;
            X.globalAlpha = 0.5;
            X.beginPath();
            X.arc(v.cx, v.cy, r + 8, 0, Math.PI * 2 * chargeP);
            X.stroke();
            // Charge percentage text
            if (chargeP > 0.1) {
                X.fillStyle = s.core;
                X.globalAlpha = 0.7;
                X.font = '10px monospace';
                X.textAlign = 'center';
                X.fillText(Math.floor(chargeP * 100) + '%', v.cx, v.cy - r - 12);
            }
            X.globalAlpha = 1;
        }
    },
    backdraft(v, X) {
        const s = v.spell;
        if (v.state === 0) {
            // Pulsing ember circle
            const pulse = 0.8 + Math.sin(v.age * 0.15) * 0.2;
            const grad = X.createRadialGradient(v.tx, v.ty, 0, v.tx, v.ty, 40 * pulse);
            grad.addColorStop(0, s.core);
            grad.addColorStop(0.4, s.c2);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.7 * pulse;
            X.beginPath();
            X.arc(v.tx, v.ty, 40 * pulse, 0, Math.PI * 2);
            X.fill();
        } else if (v.state === 1) {
            // Shrinking vortex with fire colors
            const rad = s.bdR * (1 - v.age / 20);
            const grad = X.createRadialGradient(v.tx, v.ty, 0, v.tx, v.ty, rad);
            grad.addColorStop(0, s.core);
            grad.addColorStop(0.3, s.color);
            grad.addColorStop(1, 'transparent');
            X.fillStyle = grad;
            X.globalAlpha = 0.6 * (1 - v.age / 20);
            X.beginPath();
            X.arc(v.tx, v.ty, rad, 0, Math.PI * 2);
            X.fill();
        } else if (v.state === 2) {
            // Flash + fading
            X.fillStyle = s.core;
            X.globalAlpha = Math.max(0, 1 - v.age / 15);
            X.beginPath();
            X.arc(v.tx, v.ty, s.bdR, 0, Math.PI * 2);
            X.fill();
        }
        X.globalAlpha = 1;
    },
    meteor(v, X) {
        const s = v.spell;
        if (v.state === 0) {
            // Warning circle on ground
            const iy = v.impactY || state.H - 24, r = Math.max(1, v.age * 1.4);
            X.strokeStyle = s.c2; X.lineWidth = 2; X.globalAlpha = Math.min(0.7, v.age / 30);
            X.beginPath(); X.ellipse(v.tx, iy, r, Math.max(1, r * 0.25), 0, 0, Math.PI * 2); X.stroke();
            X.strokeStyle = s.color; X.lineWidth = 1;
            X.beginPath(); X.ellipse(v.tx, iy, r * 0.6, Math.max(1, r * 0.15), v.age * 0.02, 0, Math.PI * 2); X.stroke();
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Falling fireball
            const mR = 18;
            const grad = X.createRadialGradient(v.tx, v.meteorY, 0, v.tx, v.meteorY, mR);
            grad.addColorStop(0, '#fff'); grad.addColorStop(0.2, '#ffdd44'); grad.addColorStop(0.6, s.color); grad.addColorStop(1, 'transparent');
            X.fillStyle = grad; X.globalAlpha = 0.95; X.beginPath(); X.arc(v.tx, v.meteorY, mR, 0, Math.PI * 2); X.fill();
            // Fire trail
            X.globalAlpha = 0.4;
            for (let k = 1; k < 4; k++) { X.beginPath(); X.arc(v.tx + (Math.random() - .5) * 8, v.meteorY - k * 12, mR * 0.7 - k * 2, 0, Math.PI * 2); X.fill(); }
            X.globalAlpha = 1;
            // Warning circle
            const iy = v.impactY || state.H - 24;
            X.strokeStyle = s.c2; X.lineWidth = 2; X.globalAlpha = 0.5;
            X.beginPath(); X.ellipse(v.tx, iy, 70, 18, 0, 0, Math.PI * 2); X.stroke();
            X.globalAlpha = 1;
        } else if (v.state === 2) {
            // Impact flash
            X.globalAlpha = Math.max(0, 1 - v.age / 10); X.fillStyle = '#fff'; X.fillRect(0, 0, state.W, state.H);
            X.globalAlpha = Math.max(0, 0.3 - v.age / 60); X.fillStyle = s.color; X.fillRect(0, 0, state.W, state.H);
            X.globalAlpha = 1;
        }
    }
};

// ── Revamp: spells novos (fire-new.js) ──────────────────────────────────
import * as FireNew from './fire-new.js?v=1';
SPELL_DEFS.push(...FireNew.DEFS);
Object.assign(FIRE_HANDLERS, FireNew.FIRE_HANDLERS);
Object.assign(PROJ_HOOKS, FireNew.PROJ_HOOKS);
export const TRAIL_EMITTERS = { ...FireNew.TRAIL_EMITTERS };
Object.assign(VFX_UPDATE, FireNew.VFX_UPDATE);
Object.assign(VFX_DRAW, FireNew.VFX_DRAW);
export const PROJ_DRAW = { ...FireNew.PROJ_DRAW };
