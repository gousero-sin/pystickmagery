// purecinema.js — PureCinema School: Cinematic spell compositions
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
    {
        name: 'Dust to Dust', icon: '🏜️', key: 'Z',
        color: '#c4a060', c2: '#a08040', core: '#ffe8a0',
        speed: 8, dmg: 35, mana: 25, cd: 800, r: 14,
        grav: .12, drag: .995, bounce: 0,
        exR: 70, exF: 10,
        trail: 'sand',
        isDustToDust: true,
        chargeTime: 40,
        desc: 'Click: sandplosion · Hold: form rock then throw'
    },
    {
        name: 'Ace of Spades', icon: '♠️', key: 'X',
        color: '#222222', c2: '#555555', core: '#ffffff',
        speed: 14, dmg: 30, mana: 18, cd: 4000, r: 6,
        grav: 0, drag: 1, bounce: 0,
        exR: 0, exF: 0,
        trail: 'none',
        isAceSpades: true,
        desc: 'Giant card that cuts through everything'
    },
    {
        name: 'Queen of Hearts', icon: '♛', key: 'B',
        color: '#cc2255', c2: '#ff4488', core: '#ffaacc',
        speed: 0, dmg: 0, mana: 18, cd: 4000, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 0, exF: 0,
        trail: 'none',
        isQueenHearts: true,
        desc: 'Portal that teleports the nearest enemy to where you click'
    },
    {
        name: 'Joker', icon: '🃏', key: 'N',
        color: '#cc2255', c2: '#ff4488', core: '#ffaacc',
        speed: 0, dmg: 0, mana: 18, cd: 4000, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 0, exF: 0,
        trail: 'none',
        isJokerShield: true,
        desc: 'Reflector shield that bounces projectiles'
    },
    {
        name: 'O Paradigma', icon: '🔺', key: 'C',
        color: '#79d8ff', c2: '#ffd36f', core: '#ffffff',
        speed: 0, dmg: 0, mana: 50, cd: 20000, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 0, exF: 0,
        trail: 'none',
        isParadigma: true,
        prismDur: 1200,
        prismR: 110,
        prismFace: 28,
        prismDepth: 18,
        prismMinSpeed: 14,
        prismBoost: 1.18,
        desc: 'Summons a prism that stores nearby spells and refracts them forward'
    },
    {
        name: 'Practical Effects', icon: '🎥', key: 'V',
        color: '#ffd46b', c2: '#ff8a65', core: '#fff4c2',
        speed: 0, dmg: 46, mana: 45, cd: 12000, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 130, exF: 14,
        trail: 'none',
        isPracticalEffects: true,
        rigR: 160,
        rigLiftDur: 70,
        rigHoldDur: 140,
        rigDropForce: 18,
        rigSpring: 0.042,
        rigDamp: 0.88,
        rigMaxTargets: 7,
        rigImpactR: 125,
        desc: 'Studio rig hoists the set into a brutal stunt drop'
    },
    {
        name: 'Dolly Zoom', icon: '📽️', key: 'M',
        color: '#7fd8ff', c2: '#ffd8aa', core: '#ffffff',
        speed: 0, dmg: 12, mana: 34, cd: 5400, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 0, exF: 0,
        trail: 'none',
        isDollyZoom: true,
        zoomDur: 170,
        zoomR: 210,
        zoomLockR: 58,
        zoomForce: 1.45,
        desc: 'Vertigo shot locks the center while the frame breathes in and out'
    },
    {
        name: 'Final Cut', icon: '✂️', key: '.',
        color: '#ffefb0', c2: '#ff6f91', core: '#ffffff',
        speed: 0, dmg: 24, mana: 38, cd: 6800, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 72, exF: 8,
        trail: 'none',
        isFinalCut: true,
        cutCount: 5,
        cutRange: 280,
        cutInterval: 7,
        cutBurstR: 68,
        desc: 'Rapid montage slashes jump through the frame and carve multiple marks'
    },
    {
        name: 'Tesseract', icon: '⬜', key: ',',
        color: '#aa44ff', c2: '#44ddff', core: '#ffffff',
        speed: 0, dmg: 8, mana: 55, cd: 15000, r: 0,
        grav: 0, drag: 1, bounce: 0,
        exR: 100, exF: 12,
        trail: 'none',
        isTesseract: true,
        tessSize: 40,
        tessPullR: 130,
        tessPullStr: 0.8,
        tessUnfoldDur: 40,
        tessActiveDur: 240,
        tessCollapseDur: 30,
        desc: 'Summons a 4D hypercube that folds reality and crushes all within'
    },
    createManifestSpell({
        name: 'Set Extension', icon: '🎞️',
        color: '#cba06a', c2: '#ffd3a0', core: '#fff7d1',
        manifestStyle: 'cinema', manifestEffect: 'cinema_stage', manifestProfile: 'setpiece', manifestGlyph: '[]',
        manifestDuration: 900,
        mana: 25, cd: 950, manifestArc: 12, manifestThickness: 11, manifestSegmentHp: 30, manifestPulseDmg: 3,
        desc: 'Manifest a practical set extension that locks the scene in place for a take'
    }),
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
    ...MANIFEST_FIRE_HANDLERS,
    isDustToDust(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'dust_charge', state: 0, age: 0,
            cx: tx, cy: ty, ox, oy, spell: s,
            held: true, rockFormed: false,
        });
        spawnP(ox, oy, s.color, 6, 'burst');
        SoundFX.playNoise(0.3, 0.3, 300, 'lowpass');
        return true;
    },
    isAceSpades(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'gambit_ace', state: 0, age: 0,
            cx: tx, cy: ty, ox, oy, spell: s,
        });
        spawnP(ox, oy, '#fff', 8, 'burst');
        SoundFX.playSweep(600, 1200, 'square', 0.1, 0.1);
        return true;
    },
    isQueenHearts(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'gambit_queen', state: 0, age: 0,
            cx: tx, cy: ty, ox, oy, spell: s,
        });
        spawnP(ox, oy, s.color, 8, 'burst');
        SoundFX.playSweep(400, 1000, 'sine', 0.1, 0.1);
        return true;
    },
    isJokerShield(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'gambit_joker', state: 0, age: 0,
            cx: tx, cy: ty, ox, oy, spell: s,
        });
        spawnP(ox, oy, s.core, 8, 'burst');
        SoundFX.playTone(600, 'triangle', 0.1, 0.1);
        return true;
    },
    isParadigma(s, ox, oy, tx, ty) {
        const margin = s.prismR + 20;
        const cx = Math.max(margin, Math.min(state.W - margin, tx));
        const cy = Math.max(90, Math.min(state.H - margin, ty));
        state.vfxSequences.push({
            type: 'paradigma_prism', state: 0, age: 0,
            cx, cy,
            angle: Math.atan2(ty - oy, tx - ox),
            spell: s,
            captured: [],
            floatSeed: Math.random() * Math.PI * 2,
        });
        spawnP(cx, cy, s.core, 12, 'sparkle');
        state.dynamicLights.push({
            x: cx, y: cy, r: s.prismR,
            color: s.core, int: 1.2, life: 14, ml: 14
        });
        state.shockwaves.push({
            x: cx, y: cy, r: 0, maxR: s.prismR * 0.6,
            life: 10, maxLife: 10, color: s.color
        });
        SoundFX.playSweep(220, 980, 'triangle', 0.35, 0.3);
        SoundFX.playTone(880, 'sine', 0.08, 0.12);
        return true;
    },
    isPracticalEffects(s, ox, oy, tx, ty) {
        const cx = Math.max(90, Math.min(state.W - 90, tx));
        const cy = Math.max(120, Math.min(state.H - 110, ty));
        state.vfxSequences.push({
            type: 'practical_effects', state: 0, age: 0,
            cx, cy,
            rigY: Math.max(24, cy - 150),
            fixtureY: Math.max(-30, cy - 116),
            targets: [],
            spell: s,
            seed: Math.random() * Math.PI * 2,
        });
        spawnP(cx, cy, s.core, 10, 'sparkle');
        state.dynamicLights.push({
            x: cx, y: cy - 40, r: s.rigR * 1.3,
            color: s.core, int: 1.1, life: 10, ml: 10
        });
        SoundFX.playSweep(120, 760, 'triangle', 0.35, 0.22);
        SoundFX.playNoise(0.2, 0.16, 1100, 'bandpass', 6);
        return true;
    },
    isDollyZoom(s, ox, oy, tx, ty) {
        const cx = Math.max(80, Math.min(state.W - 80, tx));
        const cy = Math.max(90, Math.min(state.H - 90, ty));
        state.vfxSequences.push({
            type: 'dolly_zoom', state: 0, age: 0,
            cx, cy,
            spell: s,
            lockCount: 0,
            seed: Math.random() * Math.PI * 2,
        });
        SoundFX.playSweep(180, 840, 'sine', 0.28, 0.24);
        SoundFX.playTone(620, 'triangle', 0.05, 0.08);
        return true;
    },
    isFinalCut(s, ox, oy, tx, ty) {
        state.vfxSequences.push({
            type: 'final_cut', state: 0, age: 0,
            cx: tx, cy: ty,
            ox, oy,
            spell: s,
            cutIndex: 0,
            marks: pickFinalCutMarks(tx, ty, s),
            slashes: [],
            history: [],
        });
        SoundFX.playSweep(900, 240, 'triangle', 0.16, 0.1);
        SoundFX.playTone(1200, 'square', 0.04, 0.04);
        return true;
    },
    isTesseract(s, ox, oy, tx, ty) {
        const cx = tx, cy = ty;
        state.vfxSequences.push({
            type: 'tesseract', state: 0, age: 0,
            cx, cy, spell: s,
            rot4: [0, 0, 0, 0, 0, 0], // 6 rotation angles for 4D (XY,XZ,XW,YZ,YW,ZW)
            unfoldProg: 0,
        });
        spawnP(cx, cy, s.core, 12, 'sparkle');
        spawnP(cx, cy, s.c2, 8, 'burst');
        state.dynamicLights.push({
            x: cx, y: cy, r: s.tessPullR,
            color: s.core, int: 1.2, life: 12, ml: 12
        });
        SoundFX.playSweep(80, 600, 'sawtooth', 0.3, 0.4);
        SoundFX.playTone(220, 'sine', 0.1, 0.3);
        state.shake(4);
        return true;
    }
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
export const PROJ_HOOKS = {
    sand: {
        onLand(p, s, hitPlat, hitEntity) {
            // Sandplosion on impact
            triggerSandplosion(p.x, p.y, s);
        }
    }
};

// ── Trail Emitters ─────────────────────────────────────────────────────────
export const TRAIL_EMITTERS = {
    sand(p, s) {
        const colors = ['#c4a060', '#a08040', '#d4b878', '#887040'];
        for (let i = 0; i < 2; i++) {
            state.particles.push({
                x: p.x + (Math.random() - .5) * 8,
                y: p.y + (Math.random() - .5) * 8,
                vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2 - 1,
                life: 15 + Math.random() * 10, ml: 25,
                color: colors[Math.random() * 4 | 0],
                size: 1.5 + Math.random() * 2, grav: 0.08, type: 'sand',
                rot: Math.random() * 6.28, rotV: (Math.random() - .5) * .3,
            });
        }
    }
};

// ── Sandplosion helper ─────────────────────────────────────────────────────
function triggerSandplosion(x, y, s) {
    const { W, H } = state;
    SoundFX.playNoise(0.5, 0.5, 150, 'lowpass');
    SoundFX.playSweep(80, 400, 'sawtooth', 0.4, 0.3);
    state.shake(12);

    // Phase 1: Implosion — pull dust FROM across the map TO the point
    for (let i = 0; i < 60; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 280;
        const sx = x + Math.cos(a) * dist, sy = y + Math.sin(a) * dist;
        const speed = 3 + Math.random() * 5;
        const dx = x - sx, dy = y - sy;
        const d = Math.hypot(dx, dy);
        state.particles.push({
            x: sx, y: Math.min(sy, H - 30),
            vx: (dx / d) * speed, vy: (dy / d) * speed,
            life: Math.floor(d / speed) + 5, ml: 50,
            color: i % 3 === 0 ? '#d4b878' : i % 3 === 1 ? '#a08040' : '#887040',
            size: 2 + Math.random() * 3, grav: 0, type: 'sand_implode',
            rot: Math.random() * 6.28, rotV: (Math.random() - .5) * .5,
        });
    }

    // Phase 2: Explosion — sand shards burst outward (delayed via separate VFX)
    state.vfxSequences.push({
        type: 'sandplosion_burst', state: 0, age: 0,
        cx: x, cy: y, spell: s,
        delay: 18, // frames before the explosion burst
    });
}

const PRISM_SPECTRUM = ['#ff6f91', '#ffd36f', '#7fe7ff', '#c5a4ff'];

function removeVfx(v) {
    const idx = state.vfxSequences.indexOf(v);
    if (idx >= 0) state.vfxSequences.splice(idx, 1);
}

function getParadigmaPose(v, s) {
    const driftX = Math.cos((v.floatSeed || 0) * 0.7 + v.age * 0.02) * 4;
    const driftY = Math.sin((v.floatSeed || 0) + v.age * 0.05) * 7;
    const cx = v.cx + driftX;
    const cy = v.cy + driftY;
    return {
        cx,
        cy,
        geom: buildPrismGeometry(cx, cy, v.angle, s.prismFace, s.prismDepth),
    };
}

function buildPrismGeometry(cx, cy, angle, faceR, depth) {
    const dirx = Math.cos(angle);
    const diry = Math.sin(angle);
    const perpx = -diry;
    const perpy = dirx;

    const frontTip = {
        x: cx + dirx * faceR,
        y: cy + diry * faceR * 0.42 - faceR * 0.62,
    };
    const baseCenter = {
        x: cx - dirx * faceR * 0.38,
        y: cy - diry * faceR * 0.18 + faceR * 0.2,
    };
    const frontLeft = {
        x: baseCenter.x + perpx * faceR * 0.92,
        y: baseCenter.y + perpy * faceR * 0.58,
    };
    const frontRight = {
        x: baseCenter.x - perpx * faceR * 0.92,
        y: baseCenter.y - perpy * faceR * 0.58,
    };

    const backOffsetX = -dirx * depth + perpx * depth * 0.26;
    const backOffsetY = -diry * depth * 0.32 - depth * 0.95;
    const backTip = { x: frontTip.x + backOffsetX, y: frontTip.y + backOffsetY };
    const backLeft = { x: frontLeft.x + backOffsetX, y: frontLeft.y + backOffsetY };
    const backRight = { x: frontRight.x + backOffsetX, y: frontRight.y + backOffsetY };

    return {
        dirx, diry, perpx, perpy,
        frontTip, frontLeft, frontRight,
        backTip, backLeft, backRight,
        front: [frontTip, frontLeft, frontRight],
        back: [backTip, backLeft, backRight],
        leftFace: [frontTip, frontLeft, backLeft, backTip],
        rightFace: [frontTip, frontRight, backRight, backTip],
        baseFace: [frontLeft, frontRight, backRight, backLeft],
    };
}

function drawPoly(X, points) {
    X.beginPath();
    X.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) X.lineTo(points[i].x, points[i].y);
    X.closePath();
}

function captureParadigmaProjectiles(v, s, cx, cy) {
    let capturedNow = 0;
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (!p?.spell || p.spell.isParadigma || p._paradigmCaptured) continue;
        const dx = p.x - cx;
        const dy = (p.y - cy) * 1.14;
        if (Math.hypot(dx, dy) > s.prismR) continue;

        p._paradigmCaptured = true;
        p._paradigmStoredLife = Math.max(60, (p.life || 0) + (p.age || 0));
        p._paradigmStoredSpeed = Math.max(4, Math.hypot(p.vx || 0, p.vy || 0));
        p._paradigmOrbit = Math.random() * Math.PI * 2;
        p._paradigmPulse = Math.random() * Math.PI * 2;
        p._paradigmLift = Math.random() * 6;
        p._paradigmColor = p.spell.core || p.spell.color || s.core;

        v.captured.push(p);
        state.projectiles.splice(i, 1);
        spawnP(p.x, p.y, p._paradigmColor, 3, 'sparkle');
        capturedNow++;
    }

    if (capturedNow > 0) {
        SoundFX.playTone(900 + Math.min(capturedNow, 6) * 50, 'sine', 0.03, 0.05);
        state.shake(Math.min(4, 1 + capturedNow * 0.4));
    }
}

function releaseParadigmaProjectiles(v, s, cx, cy) {
    const geom = buildPrismGeometry(cx, cy, v.angle, s.prismFace, s.prismDepth);
    const tip = geom.frontTip;
    const released = v.captured.splice(0);

    for (let i = 0; i < released.length; i++) {
        const p = released[i];
        const speed = Math.max(s.prismMinSpeed, p._paradigmStoredSpeed || 0) * s.prismBoost;
        p.x = tip.x - geom.dirx * i * 4;
        p.y = tip.y - geom.diry * i * 4;
        p.vx = geom.dirx * speed;
        p.vy = geom.diry * speed;
        p.age = 0;
        p.life = Math.max(60, p._paradigmStoredLife || 120);
        p.trail = [];
        p.hitList = [];
        p._paradigmCaptured = false;
        p._rifted = null;
        p._hasted = false;
        state.projectiles.push(p);
    }

    return { tip, count: released.length, geom };
}

function collectPracticalTargets(cx, cy, s) {
    return state.entities
        .filter(e => e.active)
        .map(e => ({
            entity: e,
            dist: Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy),
        }))
        .filter(entry => entry.dist < s.rigR)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, s.rigMaxTargets)
        .map((entry, idx, arr) => {
            const spread = arr.length === 1 ? 0 : (idx / (arr.length - 1)) - 0.5;
            return {
                entity: entry.entity,
                baseAngle: -Math.PI / 2 + spread * 1.4,
                radius: 26 + Math.abs(spread) * 42 + (idx % 2) * 8,
                lift: 70 + idx * 7,
                sway: Math.random() * Math.PI * 2,
                hookColor: idx % 2 === 0 ? '#ffd46b' : '#fff4c2',
            };
        });
}

function applyPracticalRigForces(v, s, cx, cy) {
    const progress = Math.min(1, (v.age + 1) / s.rigLiftDur);
    let activeTargets = 0;

    for (const target of v.targets) {
        const e = target.entity;
        if (!e?.active) continue;
        activeTargets++;

        const a = target.baseAngle + Math.sin(v.age * 0.05 + target.sway) * 0.2;
        const r = target.radius * (0.4 + progress * 0.6);
        const desiredX = cx + Math.cos(a) * r - e.w / 2;
        const desiredY = cy - target.lift * (0.35 + progress * 0.65) +
            Math.sin(v.age * 0.08 + target.sway) * 7 - e.h / 2;

        const dx = desiredX - e.x;
        const dy = desiredY - e.y;
        e.vx += dx * s.rigSpring;
        e.vy += dy * (s.rigSpring + 0.015);
        e.vx *= s.rigDamp;
        e.vy *= s.rigDamp;

        if (e.rotV !== undefined) e.rotV += Math.sin(v.age * 0.05 + target.sway) * 0.03;

        if (v.age % 12 === 0) {
            state.dynamicLights.push({
                x: e.x + e.w / 2, y: e.y + e.h / 2,
                r: 26, color: target.hookColor, int: 0.45, life: 3, ml: 3
            });
        }
    }

    return activeTargets;
}

function clampScenePoint(x, y, padX = 48, padY = 72) {
    return {
        x: Math.max(padX, Math.min(state.W - padX, x)),
        y: Math.max(padY, Math.min(state.H - padY, y)),
    };
}

function pickFinalCutMarks(tx, ty, s) {
    const marks = state.entities
        .filter((e) => e.active)
        .map((e) => ({
            entity: e,
            x: e.x + e.w / 2,
            y: e.y + e.h / 2,
            dist: Math.hypot(e.x + e.w / 2 - tx, e.y + e.h / 2 - ty),
        }))
        .filter((m) => m.dist <= s.cutRange)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, s.cutCount)
        .map((m) => ({ entity: m.entity, x: m.x, y: m.y }));

    if (marks.length) return marks;

    const fallback = [];
    for (let i = 0; i < s.cutCount; i++) {
        const a = -0.8 + i * (1.6 / Math.max(1, s.cutCount - 1));
        fallback.push(clampScenePoint(
            tx + Math.cos(a * 1.8) * (45 + i * 18),
            ty + Math.sin(a * 2.2) * (24 + i * 16),
        ));
    }
    return fallback;
}

function drawFinalCutSlash(X, slash, spell) {
    const alpha = slash.life / slash.maxLife;
    const len = 26 + (1 - alpha) * 34;
    X.save();
    X.translate(slash.x, slash.y);
    X.rotate(slash.angle);
    X.globalAlpha = alpha * 0.9;
    X.strokeStyle = spell.core;
    X.lineWidth = 5;
    X.beginPath();
    X.moveTo(-len * 0.5, -3);
    X.lineTo(len * 0.5, 3);
    X.stroke();
    X.globalAlpha = alpha * 0.45;
    X.strokeStyle = spell.c2;
    X.lineWidth = 10;
    X.beginPath();
    X.moveTo(-len * 0.6, -8);
    X.lineTo(len * 0.6, 8);
    X.stroke();
    X.restore();
}

// ── VFX Updaters ───────────────────────────────────────────────────────────
export const VFX_UPDATE = {
    ...MANIFEST_VFX_UPDATE,
    dust_charge(v) {
        const s = v.spell;
        const T = performance.now() * 0.001;

        // Track if mouse is still held
        if (state.mouse && !state.mouse.down) v.held = false;

        // Update target to follow mouse while in gather phase
        if (v.held && state.mouse) {
            v.cx = state.mouse.x;
            v.cy = state.mouse.y;
        }

        if (v.state === 0) {
            // ── GATHERING: Pull dust particles inward toward click point ──
            if (v.age % 2 === 0) {
                const a = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 200;
                const sx = v.cx + Math.cos(a) * dist, sy = v.cy + Math.sin(a) * dist;
                state.particles.push({
                    x: sx, y: sy,
                    vx: (v.cx - sx) * 0.04, vy: (v.cy - sy) * 0.04,
                    life: 25, ml: 25,
                    color: Math.random() > 0.5 ? '#c4a060' : '#a08040',
                    size: 1.5 + Math.random() * 2, grav: 0, type: 'sand',
                    rot: Math.random() * 6.28, rotV: (Math.random() - .5) * .3,
                });
            }

            // Ambient swirl
            if (v.age % 4 === 0) {
                state.dynamicLights.push({
                    x: v.cx, y: v.cy,
                    r: 40 + v.age * 0.5, color: s.core, int: 0.3, life: 3, ml: 3
                });
            }

            state.shake(Math.min(v.age / 20, 2));

            // Player animation: channel pose
            state.player.castAnim = 280;
            state.player.castType = 'channel';
            state.player.staffGlow = 250;

            // RELEASE: mouse released
            if (!v.held) {
                if (v.age >= s.chargeTime) {
                    // Held long enough → form and throw rock
                    v.state = 1; v.age = 0;
                    SoundFX.playSweep(200, 600, 'square', 0.2, 0.15);
                } else {
                    // Quick click → instant sandplosion at target
                    triggerSandplosion(v.cx, v.cy, s);
                    // Remove this VFX
                    const idx = state.vfxSequences.indexOf(v);
                    if (idx >= 0) state.vfxSequences.splice(idx, 1);
                    return;
                }
            }
        } else if (v.state === 1) {
            // ── ROCK FORMATION: particles compress into a rock ──
            state.player.castAnim = 280;
            state.player.castType = 'up';
            state.player.sq = 1.15; state.player.st = 0.85;

            if (v.age % 2 === 0) {
                for (let k = 0; k < 4; k++) {
                    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 40;
                    state.particles.push({
                        x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d,
                        vx: (v.cx - (v.cx + Math.cos(a) * d)) * 0.15,
                        vy: (v.cy - (v.cy + Math.sin(a) * d)) * 0.15,
                        life: 12, ml: 12,
                        color: k % 2 ? '#d4b878' : '#887040',
                        size: 2 + Math.random() * 3, grav: 0, type: 'sand',
                        rot: Math.random() * 6, rotV: (Math.random() - .5) * .4,
                    });
                }
            }

            state.dynamicLights.push({
                x: v.cx, y: v.cy,
                r: 60, color: s.core, int: 0.8 + Math.sin(T * 8) * 0.3, life: 2, ml: 2
            });
            state.shake(3);

            if (v.age > 25) {
                // Launch rock projectile toward target
                v.state = 2; v.age = 0;
                const p = state.player;
                const ox = p.x + p.w / 2 + p.facing * 10, oy = p.y + 8;
                const a = Math.atan2(v.cy - oy, v.cx - ox);
                const spd = s.speed;
                state.projectiles.push({
                    x: v.cx, y: v.cy,
                    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    spell: s, life: 200, age: 0, trail: [],
                    hitList: [], bounces: 0, chains: 0,
                    growR: s.r, growDmg: s.dmg,
                    isSandRock: true,
                });
                spawnP(v.cx, v.cy, s.color, 15, 'burst');
                state.shockwaves.push({
                    x: v.cx, y: v.cy, r: 0, maxR: 40,
                    life: 10, maxLife: 10, color: s.color
                });
                SoundFX.playNoise(0.3, 0.4, 200, 'lowpass');

                p.castAnim = 280; p.castType = 'thrust';
                p.sq = 0.8; p.st = 1.2;
            }
        } else if (v.state === 2) {
            // ── CLEANUP: VFX done after rock launched ──
            if (v.age > 5) {
                removeVfx(v);
            }
        }
    },

    sandplosion_burst(v) {
        const s = v.spell;

        if (v.state === 0) {
            // Wait for implosion particles to arrive
            if (v.age >= v.delay) { v.state = 1; v.age = 0; }
        } else if (v.state === 1) {
            // BURST!
            if (v.age === 1) {
                explode(v.cx, v.cy, s.exR, s.exF, s.dmg, s.color, s.c2);

                // Sand shard particles — dramatic outward burst
                for (let i = 0; i < 50; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const spd = 3 + Math.random() * 8;
                    state.particles.push({
                        x: v.cx + (Math.random() - .5) * 10,
                        y: v.cy + (Math.random() - .5) * 10,
                        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3,
                        life: 40 + Math.random() * 40, ml: 80,
                        color: i % 4 === 0 ? '#ffe8a0' : i % 4 === 1 ? '#c4a060' : i % 4 === 2 ? '#a08040' : '#887040',
                        size: 2 + Math.random() * 4, grav: 0.12, type: 'debris',
                        rot: Math.random() * 6, rotV: (Math.random() - .5) * .6,
                    });
                }

                // Ground dust cloud
                for (let i = 0; i < 20; i++) {
                    state.particles.push({
                        x: v.cx + (Math.random() - .5) * 80,
                        y: v.cy + Math.random() * 10,
                        vx: (Math.random() - .5) * 3, vy: -Math.random() * 2 - 0.5,
                        life: 50 + Math.random() * 30, ml: 80,
                        color: '#c4a06066',
                        size: 5 + Math.random() * 6, grav: -0.02, type: 'smoke',
                        rot: Math.random() * 6, rotV: (Math.random() - .5) * .1,
                    });
                }

                state.shockwaves.push({
                    x: v.cx, y: v.cy, r: 0, maxR: s.exR * 1.8,
                    life: 22, maxLife: 22, color: s.core
                });
                state.dynamicLights.push({
                    x: v.cx, y: v.cy,
                    r: s.exR * 2, color: s.core, int: 2.5, life: 15, ml: 15
                });
                state.shake(15);
            }
            if (v.age > 30) removeVfx(v);
        }
    },

    paradigma_prism(v) {
        const s = v.spell;
        const T = performance.now() * 0.001;
        const { cx, cy, geom } = getParadigmaPose(v, s);

        if (v.state === 0) {
            if (v.age === 1) {
                state.player.castAnim = 280;
                state.player.castType = 'channel';
                state.player.staffGlow = 250;
            }
            if (v.age % 2 === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = 20 + Math.random() * 34;
                const col = PRISM_SPECTRUM[((v.age / 2) + (Math.random() * 4 | 0)) % PRISM_SPECTRUM.length];
                state.particles.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r * 0.5,
                    vx: -Math.cos(a) * 1.4,
                    vy: -Math.sin(a) * 0.7 - 0.3,
                    life: 18, ml: 18,
                    color: col,
                    size: 2 + Math.random() * 1.5,
                    grav: -0.01,
                    type: 'sparkle',
                });
            }
            state.dynamicLights.push({
                x: cx, y: cy - 8, r: 70 + v.age * 2,
                color: s.core, int: 0.55, life: 2, ml: 2
            });
            if (v.age > 18) {
                v.state = 1;
                v.age = 0;
            }
            return;
        }

        if (v.state === 1) {
            captureParadigmaProjectiles(v, s, cx, cy);
            v.maxStored = Math.max(v.maxStored || 0, v.captured.length);

            if (v.age % 4 === 0) {
                const a = Math.random() * Math.PI * 2;
                const fieldR = s.prismR * (0.55 + Math.random() * 0.45);
                const col = PRISM_SPECTRUM[(Math.random() * PRISM_SPECTRUM.length) | 0];
                state.particles.push({
                    x: cx + Math.cos(a) * fieldR,
                    y: cy + Math.sin(a) * fieldR * 0.52,
                    vx: -Math.cos(a) * 1.8 + geom.dirx * 0.8,
                    vy: -Math.sin(a) * 0.9 + geom.diry * 0.4 - 0.4,
                    life: 20, ml: 20,
                    color: col,
                    size: 1.5 + Math.random() * 1.5,
                    grav: -0.01,
                    type: 'trail',
                });
            }
            if (v.captured.length > 0 && v.age % 30 === 0) {
                SoundFX.playTone(520 + Math.min(v.captured.length, 12) * 24, 'sine', 0.015, 0.04);
            }
            state.dynamicLights.push({
                x: cx, y: cy - 10, r: s.prismR * 1.45,
                color: s.color, int: 0.45 + Math.sin(T * 3.5) * 0.15, life: 2, ml: 2
            });
            state.dynamicLights.push({
                x: geom.frontTip.x, y: geom.frontTip.y, r: 48,
                color: s.core, int: 0.55 + Math.cos(T * 5) * 0.15, life: 2, ml: 2
            });

            if (v.age > s.prismDur) {
                v.state = 2;
                v.age = 0;
            }
            return;
        }

        if (v.state === 2) {
            if (v.age === 1) {
                const released = releaseParadigmaProjectiles(v, s, cx, cy);
                v.releaseCount = released.count;
                v.releaseTipX = released.tip.x;
                v.releaseTipY = released.tip.y;

                const beamParticles = Math.max(24, released.count * 3);
                const beamLen = 130 + released.count * 4;
                for (let i = 0; i < beamParticles; i++) {
                    const t = i / Math.max(1, beamParticles - 1);
                    const col = PRISM_SPECTRUM[i % PRISM_SPECTRUM.length];
                    const spread = (i % PRISM_SPECTRUM.length) - 1.5;
                    state.particles.push({
                        x: released.tip.x + released.geom.dirx * beamLen * t + released.geom.perpx * spread * 6,
                        y: released.tip.y + released.geom.diry * beamLen * t + released.geom.perpy * spread * 2 - t * 6,
                        vx: released.geom.dirx * (5 + t * 4),
                        vy: released.geom.diry * (5 + t * 4) - 0.15,
                        life: 18 + Math.random() * 6, ml: 24,
                        color: col,
                        size: 2 + Math.random() * 2,
                        grav: -0.01,
                        type: 'sparkle',
                    });
                }

                state.shockwaves.push({
                    x: released.tip.x, y: released.tip.y,
                    r: 0, maxR: s.prismR * 1.2,
                    life: 18, maxLife: 18, color: s.core
                });
                state.dynamicLights.push({
                    x: released.tip.x, y: released.tip.y,
                    r: s.prismR * 1.8, color: s.core, int: 2.3, life: 12, ml: 12
                });
                SoundFX.playSweep(260, 1800, 'triangle', 0.5, 0.35);
                SoundFX.playNoise(0.25, 0.12, 1800, 'bandpass', 8);
                state.shake(Math.min(12, 4 + released.count * 0.35));
            }
            if (v.age > 18) removeVfx(v);
        }
    },

    practical_effects(v) {
        const s = v.spell;
        const T = performance.now() * 0.001;
        const cx = v.cx;
        const cy = v.cy + Math.sin(v.age * 0.015 + v.seed) * 2;

        if (v.state === 0) {
            if (v.age === 1) {
                v.targets = collectPracticalTargets(cx, cy, s);
                v.fixtureY = v.rigY + 22;
                state.player.castAnim = 320;
                state.player.castType = 'up';
                state.player.staffGlow = 280;
                spawnP(cx, cy, s.core, 14, 'sparkle');
            }

            if (v.age % 3 === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * s.rigR * 0.75;
                state.particles.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r * 0.4,
                    vx: -Math.cos(a) * 1.2,
                    vy: -Math.sin(a) * 0.5 - 0.3,
                    life: 22, ml: 22,
                    color: Math.random() > 0.5 ? s.core : s.color,
                    size: 2 + Math.random() * 2,
                    grav: -0.01,
                    type: 'sparkle',
                });
            }

            state.dynamicLights.push({
                x: cx, y: cy - 20, r: s.rigR * 1.1,
                color: s.core, int: 0.45 + Math.sin(T * 3) * 0.08, life: 2, ml: 2
            });

            if (v.age > 18) {
                v.state = 1;
                v.age = 0;
            }
            return;
        }

        if (v.state === 1) {
            const activeTargets = applyPracticalRigForces(v, s, cx, cy);

            if (v.age % 4 === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = s.rigR * (0.3 + Math.random() * 0.55);
                state.particles.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r * 0.38,
                    vx: -Math.cos(a) * 1.4,
                    vy: -0.2 - Math.sin(a) * 0.3,
                    life: 18, ml: 18,
                    color: Math.random() > 0.5 ? s.color : s.c2,
                    size: 1.5 + Math.random() * 1.5,
                    grav: -0.005,
                    type: 'trail',
                });
            }

            if (v.age % 18 === 0) {
                SoundFX.playTone(320 + Math.min(activeTargets, 8) * 30, 'sine', 0.02, 0.05);
                state.shake(Math.min(3, 1 + activeTargets * 0.2));
            }

            state.dynamicLights.push({
                x: cx, y: v.rigY + 36, r: s.rigR * 1.3,
                color: s.core, int: 0.7 + Math.sin(T * 4) * 0.12, life: 2, ml: 2
            });

            if (activeTargets === 0 && v.age > 24) {
                v.state = 2;
                v.age = 0;
                return;
            }

            if (v.age > s.rigLiftDur + s.rigHoldDur) {
                v.state = 2;
                v.age = 0;
            }
            return;
        }

        if (v.state === 2) {
            if (v.age === 1) {
                v.fixtureY = v.rigY + 22;
                v.dropY = cy + 48;
                for (let i = 0; i < v.targets.length; i++) {
                    const target = v.targets[i];
                    const e = target.entity;
                    if (!e?.active) continue;
                    const dx = (e.x + e.w / 2 - cx) * 0.08;
                    e.vx += dx;
                    e.vy += s.rigDropForce + i * 0.8;
                    if (e.rotV !== undefined) e.rotV += (Math.random() - 0.5) * 0.8;
                    if (e.type === 'dummy') hurtEntity(e, Math.floor(s.dmg * 0.22), cx, cy);
                }
                SoundFX.playSweep(1800, 180, 'sawtooth', 0.4, 0.55);
                SoundFX.playNoise(0.18, 0.08, 1600, 'bandpass', 8);
                state.shake(8);
            }

            v.fixtureY += 12 + v.age * 0.55;

            if (v.age % 2 === 0) {
                state.particles.push({
                    x: cx + (Math.random() - 0.5) * 18,
                    y: v.fixtureY + 8,
                    vx: (Math.random() - 0.5) * 2.4,
                    vy: -Math.random() * 1.2,
                    life: 20, ml: 20,
                    color: Math.random() > 0.5 ? s.c2 : s.core,
                    size: 3 + Math.random() * 2,
                    grav: -0.01,
                    type: 'smoke',
                });
            }

            state.dynamicLights.push({
                x: cx, y: v.fixtureY, r: 90,
                color: s.c2, int: 1.15, life: 2, ml: 2
            });

            if (v.fixtureY >= v.dropY) {
                explode(cx, cy + 52, s.rigImpactR, s.exF, s.dmg, s.color, s.c2);
                spawnP(cx, cy + 52, s.core, 18, 'burst');
                spawnP(cx, cy + 52, '#ffffff', 8, 'sparkle');
                state.shockwaves.push({
                    x: cx, y: cy + 52, r: 0, maxR: s.rigImpactR * 1.4,
                    life: 22, maxLife: 22, color: s.core
                });
                SoundFX.playNoise(0.55, 0.25, 120, 'lowpass');
                state.shake(16);
                v.state = 3;
                v.age = 0;
            }
            return;
        }

        if (v.state === 3) {
            if (v.age % 3 === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = 20 + Math.random() * s.rigImpactR * 0.6;
                state.particles.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + 54 + Math.sin(a) * r * 0.25,
                    vx: Math.cos(a) * (1.5 + Math.random() * 2),
                    vy: -Math.random() * 1.5,
                    life: 24, ml: 24,
                    color: Math.random() > 0.5 ? s.color : s.c2,
                    size: 2 + Math.random() * 2,
                    grav: 0.03,
                    type: 'dust',
                });
            }

            state.dynamicLights.push({
                x: cx, y: cy + 52, r: s.rigImpactR,
                color: s.core, int: Math.max(0, 1 - v.age / 26), life: 2, ml: 2
            });

            if (v.age > 34) removeVfx(v);
        }
    },

    dolly_zoom(v) {
        const s = v.spell;
        const T = performance.now() * 0.001;

        if (v.state === 0) {
            if (v.age === 1) {
                state.player.castAnim = 240;
                state.player.castType = 'channel';
                state.player.staffGlow = 260;
            }
            if (v.age % 3 === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = 20 + Math.random() * 36;
                state.particles.push({
                    x: v.cx + Math.cos(a) * r,
                    y: v.cy + Math.sin(a) * r * 0.55,
                    vx: -Math.cos(a) * 1.4,
                    vy: -Math.sin(a) * 0.7,
                    life: 18, ml: 18,
                    color: Math.random() > 0.5 ? s.core : s.c2,
                    size: 1.8 + Math.random() * 1.6,
                    grav: -0.01,
                    type: 'sparkle',
                });
            }
            if (v.age > 18) { v.state = 1; v.age = 0; }
            return;
        }

        if (v.state === 1) {
            const wave = Math.sin(v.age * 0.22);
            let locked = 0;

            if (v.age % 2 === 0) {
                for (let k = 0; k < 3; k++) {
                    const a = Math.random() * Math.PI * 2;
                    const r = s.zoomLockR + Math.random() * (s.zoomR - s.zoomLockR);
                    state.particles.push({
                        x: v.cx + Math.cos(a) * r,
                        y: v.cy + Math.sin(a) * r * 0.58,
                        vx: -Math.cos(a) * 0.5 + wave * 0.8,
                        vy: -Math.sin(a) * 0.2,
                        life: 14, ml: 14,
                        color: k === 0 ? s.c2 : s.core,
                        size: 1.5 + Math.random() * 1.5,
                        grav: -0.005,
                        type: 'trail',
                    });
                }
            }

            for (const e of state.entities) {
                if (!e.active) continue;
                const ex = e.x + e.w / 2;
                const ey = e.y + e.h / 2;
                const dx = ex - v.cx;
                const dy = ey - v.cy;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist < s.zoomLockR) {
                    locked++;
                    e.vx += (-dx) * 0.08 / (e.mass || 1);
                    e.vy += (-dy) * 0.08 / (e.mass || 1);
                    e.vx *= 0.68;
                    e.vy *= 0.68;
                    if (v.age % 24 === 0) hurtEntity(e, s.dmg, v.cx, v.cy);
                } else if (dist < s.zoomR) {
                    const force = (1 - dist / s.zoomR) * s.zoomForce * wave / (e.mass || 1);
                    e.vx += dx / dist * force;
                    e.vy += dy / dist * force * 0.45;
                }
            }

            for (const p of state.projectiles) {
                const dx = p.x - v.cx;
                const dy = p.y - v.cy;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist < s.zoomLockR * 0.9) {
                    p.vx *= 0.82;
                    p.vy *= 0.82;
                } else if (dist < s.zoomR) {
                    const force = (1 - dist / s.zoomR) * 0.45 * wave;
                    p.vx += dx / dist * force;
                    p.vy += dy / dist * force * 0.35;
                }
            }

            v.lockCount = locked;
            state.dynamicLights.push({
                x: v.cx, y: v.cy, r: s.zoomR * 1.1,
                color: s.core, int: 0.35 + Math.cos(T * 3.2) * 0.08, life: 2, ml: 2
            });

            if (v.age > s.zoomDur) {
                v.state = 2;
                v.age = 0;
                SoundFX.playSweep(300, 1200, 'triangle', 0.24, 0.18);
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.zoomR * 0.9, life: 12, maxLife: 12, color: s.c2 });
            }
            return;
        }

        if (v.state === 2) {
            if (v.age === 1) state.shake(6);
            if (v.age > 16) removeVfx(v);
        }
    },

    final_cut(v) {
        const s = v.spell;

        if (v.state === 0) {
            if (v.age === 1) {
                state.player.castAnim = 200;
                state.player.castType = 'thrust';
                state.player.staffGlow = 240;
                state.shake(2);
            }
            if (v.age > 10) { v.state = 1; v.age = 0; }
            return;
        }

        if (v.state === 1) {
            for (const slash of v.slashes) slash.life -= 1;
            v.slashes = v.slashes.filter((slash) => slash.life > 0);

            if (v.age % s.cutInterval === 1 && v.cutIndex < v.marks.length) {
                const mark = v.marks[v.cutIndex];
                const mx = mark.entity?.active ? mark.entity.x + mark.entity.w / 2 : mark.x;
                const my = mark.entity?.active ? mark.entity.y + mark.entity.h / 2 : mark.y;
                const angle = Math.atan2(my - v.oy, mx - v.ox) + (Math.random() - 0.5) * 0.7;
                v.slashes.push({ x: mx, y: my, angle, life: 10, maxLife: 10 });
                v.history.push({ x: mx, y: my });
                v.lastX = mx;
                v.lastY = my;

                if (mark.entity?.active) {
                    hurtEntity(mark.entity, s.dmg, mx, my);
                    mark.entity.vx += Math.cos(angle) * 4 / (mark.entity.mass || 1);
                    mark.entity.vy += Math.sin(angle) * 2 / (mark.entity.mass || 1) - 2;
                } else {
                    for (const e of state.entities) {
                        if (!e.active) continue;
                        const dist = Math.hypot(e.x + e.w / 2 - mx, e.y + e.h / 2 - my);
                        if (dist < 42) hurtEntity(e, Math.floor(s.dmg * 0.6), mx, my);
                    }
                }

                spawnP(mx, my, s.core, 8, 'sparkle');
                spawnP(mx, my, s.c2, 6, 'burst');
                state.dynamicLights.push({ x: mx, y: my, r: 56, color: s.core, int: 1.2, life: 6, ml: 6 });
                SoundFX.playSweep(1400, 260, 'sawtooth', 0.08, 0.06);
                state.shake(4);
                v.cutIndex += 1;
            }

            if (v.cutIndex >= v.marks.length && v.slashes.length === 0 && v.age > s.cutInterval * Math.max(1, v.marks.length)) {
                v.state = 2;
                v.age = 0;
            }
            return;
        }

        if (v.state === 2) {
            if (v.age === 1) {
                const fx = v.lastX ?? v.cx;
                const fy = v.lastY ?? v.cy;
                state.shockwaves.push({ x: fx, y: fy, r: 0, maxR: s.cutBurstR, life: 12, maxLife: 12, color: s.c2 });
                state.dynamicLights.push({ x: fx, y: fy, r: s.cutBurstR * 1.3, color: s.core, int: 1.6, life: 8, ml: 8 });
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const dist = Math.hypot(e.x + e.w / 2 - fx, e.y + e.h / 2 - fy);
                    if (dist < s.cutBurstR) hurtEntity(e, Math.floor(s.dmg * 0.55), fx, fy);
                }
                SoundFX.playSweep(300, 1800, 'square', 0.18, 0.14);
                state.shake(7);
            }
            if (v.age > 14) removeVfx(v);
        }
    },

    // ═══ TESSERACT — Quantum 4D Hypercube ═══
    tesseract(v) {
        const s = v.spell;

        // Advance 4D rotation angles (6 planes of rotation)
        const spd = [0.023, 0.017, 0.031, 0.013, 0.029, 0.019];
        for (let i = 0; i < 6; i++) v.rot4[i] += spd[i];

        // ── STATE 0: SUPERPOSITION — Multiple ghost positions ──
        if (v.state === 0) {
            v.unfoldProg = Math.min(1, v.age / s.tessUnfoldDur);

            if (v.age === 1) {
                v.ghosts = [];
                for (let g = 0; g < 3; g++) {
                    const a = (g / 3) * Math.PI * 2 + Math.random() * 0.5;
                    const r = 35 + Math.random() * 25;
                    v.ghosts.push({
                        ox: Math.cos(a) * r, oy: Math.sin(a) * r,
                        phase: Math.random() * Math.PI * 2,
                        flickerRate: 0.08 + Math.random() * 0.04,
                        opacity: 0,
                    });
                }
                v.entangled = [];
                v.wavePsi = 0;
                v.observerCount = 0;
            }

            for (const g of v.ghosts) {
                g.opacity = Math.max(0, Math.sin(v.age * g.flickerRate + g.phase) * 0.4 + 0.5) * v.unfoldProg;
            }

            if (v.age % 2 === 0) {
                const g = v.ghosts[v.age % 3];
                state.particles.push({
                    x: v.cx + g.ox + (Math.random() - .5) * 20,
                    y: v.cy + g.oy + (Math.random() - .5) * 20,
                    vx: (Math.random() - .5) * 1.5, vy: (Math.random() - .5) * 1.5,
                    life: 15, ml: 15,
                    color: [s.color, s.c2, '#ff44ff', '#44ffff'][Math.random() * 4 | 0],
                    size: 1 + Math.random(), grav: 0, type: 'sparkle',
                });
            }

            if (v.age % 5 === 0) {
                const waveAngle = v.age * 0.15;
                for (let i = 0; i < 3; i++) {
                    const a = waveAngle + i * Math.PI * 2 / 3;
                    const waveR = 20 + Math.sin(v.age * 0.1 + i) * 15;
                    state.particles.push({
                        x: v.cx + Math.cos(a) * waveR, y: v.cy + Math.sin(a) * waveR,
                        vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5,
                        life: 12, ml: 12, color: s.core, size: 1.5, grav: 0, type: 'trail',
                    });
                }
            }

            state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.tessPullR * v.unfoldProg * 0.6, color: s.color, int: 0.4 * v.unfoldProg, life: 2, ml: 2 });
            if (v.age % 8 === 0) SoundFX.playTone(200 + v.age * 3, 'sine', 0.02, 0.08);
            if (v.age >= s.tessUnfoldDur) { v.state = 1; v.age = 0; SoundFX.playSweep(300, 900, 'triangle', 0.15, 0.3); }
            return;
        }

        // ── STATE 1: OBSERVATION & ENTANGLEMENT ──
        if (v.state === 1) {
            v.unfoldProg = 1;
            v.observerCount = 0;

            for (const g of v.ghosts) {
                g.ox += Math.sin(v.age * 0.02 + g.phase) * 0.3;
                g.oy += Math.cos(v.age * 0.025 + g.phase) * 0.3;
                g.opacity = Math.max(0.2, Math.sin(v.age * g.flickerRate + g.phase) * 0.3 + 0.6);
            }

            const nearbyEntities = [];
            for (const e of state.entities) {
                if (!e.active) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                const dist = Math.hypot(v.cx - ex, v.cy - ey);
                if (dist < s.tessPullR) {
                    v.observerCount++;
                    nearbyEntities.push(e);
                    const uncertainty = (1 - dist / s.tessPullR) * 3;
                    e.x += (Math.random() - .5) * uncertainty;
                    e.y += (Math.random() - .5) * uncertainty;
                    let minGDist = Infinity, nearestG = null;
                    for (const g of v.ghosts) {
                        const gd = Math.hypot(v.cx + g.ox - ex, v.cy + g.oy - ey);
                        if (gd < minGDist) { minGDist = gd; nearestG = g; }
                    }
                    if (nearestG && minGDist < s.tessSize * 2) {
                        const gx = v.cx + nearestG.ox, gy = v.cy + nearestG.oy;
                        e.vx += (gx - ex) / Math.max(minGDist, 1) * s.tessPullStr * 0.5;
                        e.vy += (gy - ey) / Math.max(minGDist, 1) * s.tessPullStr * 0.5;
                    }
                    if (v.age % 15 === 0 && Math.random() < 0.6 && dist < s.tessSize * 1.8) {
                        if (e.type === 'dummy') hurtEntity(e, s.dmg, v.cx, v.cy);
                    }
                    if (v.age % 60 === 0 && Math.random() < 0.15) {
                        e.y -= 20 + Math.random() * 30; e.vy = -2;
                        spawnP(ex, ey, '#ff44ff', 6, 'sparkle');
                        spawnP(e.x + e.w / 2, e.y + e.h / 2, '#44ffff', 6, 'sparkle');
                        SoundFX.playTone(800 + Math.random() * 400, 'sine', 0.03, 0.05);
                    }
                }
            }

            if (v.age === 1 && nearbyEntities.length >= 2) {
                v.entangled = [];
                for (let i = 0; i < nearbyEntities.length - 1; i += 2) v.entangled.push([nearbyEntities[i], nearbyEntities[i + 1]]);
            }

            if (v.age % 25 === 0) {
                for (const [ea, eb] of v.entangled) {
                    if (!ea.active || !eb.active) continue;
                    if (ea.type === 'dummy') hurtEntity(ea, Math.floor(s.dmg * 0.5), v.cx, v.cy);
                    if (eb.type === 'dummy') hurtEntity(eb, Math.floor(s.dmg * 0.5), v.cx, v.cy);
                    spawnP(ea.x + ea.w / 2, ea.y + ea.h / 2, '#ff44ff', 3, 'sparkle');
                    spawnP(eb.x + eb.w / 2, eb.y + eb.h / 2, '#44ffff', 3, 'sparkle');
                }
            }

            if (v.age % 3 === 0) {
                const g = v.ghosts[v.age % v.ghosts.length];
                state.particles.push({
                    x: v.cx + g.ox + (Math.random() - .5) * 15, y: v.cy + g.oy + (Math.random() - .5) * 15,
                    vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2,
                    life: 14, ml: 14,
                    color: [s.color, s.c2, s.core, '#ff44ff'][Math.random() * 4 | 0],
                    size: 1 + Math.random() * 1.5, grav: 0, type: 'sparkle',
                });
            }

            if (v.age % 6 === 0) {
                const waveR = s.tessPullR * 0.7;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2 + v.age * 0.05;
                    const psi2 = Math.pow(Math.cos(a * 3 + v.age * 0.08), 2);
                    if (psi2 < 0.3) continue;
                    state.particles.push({
                        x: v.cx + Math.cos(a) * waveR * psi2, y: v.cy + Math.sin(a) * waveR * psi2,
                        vx: -Math.sin(a) * 1.5, vy: Math.cos(a) * 1.5,
                        life: 10, ml: 10, color: s.c2, size: 1.5 * psi2, grav: 0, type: 'trail',
                    });
                }
            }

            if (v.age % 30 === 0) SoundFX.playTone(120 + v.observerCount * 60, 'sine', 0.03, 0.1);

            const pulse = 0.5 + Math.sin(v.age * 0.06) * 0.3;
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.tessPullR * pulse, color: v.age % 40 < 20 ? s.color : s.c2, int: 0.6 + v.observerCount * 0.05, life: 2, ml: 2 });
            for (const g of v.ghosts) state.dynamicLights.push({ x: v.cx + g.ox, y: v.cy + g.oy, r: s.tessSize * g.opacity, color: s.color, int: 0.3 * g.opacity, life: 2, ml: 2 });
            if (v.age % 10 === 0) state.shake(0.5 + v.observerCount * 0.3);
            if (v.age >= s.tessActiveDur) { v.state = 2; v.age = 0; v.wavePsi = 1; SoundFX.playSweep(1200, 80, 'sawtooth', 0.3, 0.6); }
            return;
        }

        // ── STATE 2: WAVE FUNCTION COLLAPSE ──
        if (v.state === 2) {
            const collProg = Math.min(1, v.age / s.tessCollapseDur);
            v.unfoldProg = 1 - collProg;
            v.wavePsi = 1 - collProg;

            for (const g of v.ghosts) { g.ox *= 0.88; g.oy *= 0.88; g.opacity = (1 - collProg) * 0.8; }

            if (v.age % 2 === 0) {
                const waveR = s.tessPullR * (1 - collProg);
                for (let i = 0; i < 6; i++) {
                    const a = Math.random() * Math.PI * 2;
                    state.particles.push({
                        x: v.cx + Math.cos(a) * waveR, y: v.cy + Math.sin(a) * waveR,
                        vx: -Math.cos(a) * (3 + collProg * 5), vy: -Math.sin(a) * (3 + collProg * 5),
                        life: 12, ml: 12,
                        color: [s.color, s.c2, s.core, '#ff44ff', '#44ffff'][Math.random() * 5 | 0],
                        size: 2 + (1 - collProg) * 2, grav: 0, type: 'sparkle',
                    });
                }
            }

            if (v.age % 8 === 0) {
                for (const e of state.entities) {
                    if (!e.active) continue;
                    const d = Math.hypot(v.cx - e.x - e.w / 2, v.cy - e.y - e.h / 2);
                    if (d < s.tessPullR * (1 - collProg * 0.7) * 0.5) {
                        e.vx += (v.cx - e.x - e.w / 2) / Math.max(d, 1) * 2;
                        e.vy += (v.cy - e.y - e.h / 2) / Math.max(d, 1) * 2;
                    }
                }
            }

            state.shake(4 + collProg * 12);

            if (v.age === Math.floor(s.tessCollapseDur * 0.9)) {
                explode(v.cx, v.cy, s.exR * 1.2, s.exF, s.dmg * 6, s.color, s.c2);
                spawnP(v.cx, v.cy, s.core, 30, 'burst');
                spawnP(v.cx, v.cy, '#ff44ff', 20, 'sparkle');
                spawnP(v.cx, v.cy, '#44ffff', 15, 'sparkle');
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.exR * 2, life: 24, maxLife: 24, color: s.c2 });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.exR * 1.3, life: 18, maxLife: 18, color: '#ff44ff' });
                SoundFX.playSweep(2000, 40, 'sawtooth', 0.6, 0.8);
                SoundFX.playNoise(0.5, 0.4, 150, 'lowpass');
                state.shake(20);
            }

            state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.exR * (1 + collProg), color: s.core, int: 1 + collProg * 2, life: 2, ml: 2 });
            if (v.age > s.tessCollapseDur) { v.state = 3; v.age = 0; }
            return;
        }

        // ── STATE 3: QUANTUM DECOHERENCE ──
        if (v.state === 3) {
            v.unfoldProg = Math.max(0, 1 - v.age / 40);
            if (v.age % 4 === 0 && v.unfoldProg > 0.1) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * s.exR * v.unfoldProg;
                state.particles.push({
                    x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r,
                    vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
                    life: 16, ml: 16, color: Math.random() > .5 ? '#ff44ff' : '#44ffff',
                    size: 1.5, grav: 0, type: 'trail',
                });
            }
            state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.exR * v.unfoldProg, color: s.core, int: v.unfoldProg, life: 2, ml: 2 });
            if (v.age > 45) removeVfx(v);
        }
    },

    // ═══ GAMBIT: ACE OF SPADES — Giant cutting card ═══
    gambit_ace(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Calculate direction and launch
            const p = state.player;
            const ox = p.x + p.w / 2, oy = p.y + p.h / 2;
            v.angle = Math.atan2(v.cy - oy, v.cx - ox);
            v.px = ox; v.py = oy;
            v.vx = Math.cos(v.angle) * s.speed;
            v.vy = Math.sin(v.angle) * s.speed;
            v.state = 1; v.age = 0;
            p.castAnim = 280; p.castType = 'slash';
            SoundFX.playSweep(800, 200, 'sawtooth', 0.15, 0.3);
            state.shake(4);
        } else if (v.state === 1) {
            // Fly through everything for 60 frames
            v.px += v.vx; v.py += v.vy;
            // Damage all entities near the card
            for (const e of state.entities) {
                if (!e.active) continue;
                const d = Math.hypot(e.x + e.w / 2 - v.px, e.y + e.h / 2 - v.py);
                if (d < 35 && !v['hit_' + state.entities.indexOf(e)]) {
                    hurtEntity(e, s.dmg, v.px, v.py);
                    const ka = v.angle;
                    e.vx += Math.cos(ka) * 4 / (e.mass || 1);
                    e.vy += Math.sin(ka) * 4 / (e.mass || 1) - 2;
                    v['hit_' + state.entities.indexOf(e)] = true;
                    spawnP(e.x + e.w / 2, e.y + e.h / 2, '#ffaacc', 8, 'burst');
                    state.shake(3);
                }
            }
            // Trail particles
            if (v.age % 2 === 0) {
                spawnP(v.px + (Math.random() - .5) * 10, v.py + (Math.random() - .5) * 10, s.core, 2, 'sparkle');
                state.dynamicLights.push({ x: v.px, y: v.py, r: 50, color: s.color, int: 0.6, life: 3, ml: 3 });
            }
            if (v.age > 60 || v.px < -50 || v.px > state.W + 50 || v.py < -50 || v.py > state.H + 50) {
                spawnP(v.px, v.py, s.color, 12, 'burst');
                const idx = state.vfxSequences.indexOf(v);
                if (idx >= 0) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    // ═══ GAMBIT: QUEEN — Teleport portal ═══
    gambit_queen(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Find nearest entity to player
            let closest = null, cd = 250;
            const px = state.player.x + state.player.w / 2, py = state.player.y + state.player.h / 2;
            for (const e of state.entities) {
                if (!e.active) continue;
                const d = Math.hypot(e.x + e.w / 2 - px, e.y + e.h / 2 - py);
                if (d < cd) { cd = d; closest = e; }
            }
            v.target = closest;
            if (closest) {
                v.srcX = closest.x + closest.w / 2;
                v.srcY = closest.y + closest.h;
            }
            v.state = 1; v.age = 0;
            state.player.castAnim = 280; state.player.castType = 'channel';
            SoundFX.playSweep(400, 1000, 'sine', 0.2, 0.2);
        } else if (v.state === 1) {
            // Portal opening animation
            if (v.age % 3 === 0 && v.target) {
                spawnP(v.srcX, v.srcY, s.c2, 2, 'sparkle');
                spawnP(v.cx, v.cy, s.color, 2, 'sparkle');
            }
            state.shake(Math.min(v.age / 10, 2));
            if (v.age > 25) { v.state = 2; v.age = 0; }
        } else if (v.state === 2) {
            // Teleport!
            if (v.age === 1 && v.target && v.target.active) {
                const e = v.target;
                e.x = v.cx - e.w / 2;
                e.y = v.cy - e.h;
                e.vx = 0; e.vy = 0;
                spawnP(v.srcX, v.srcY, s.c2, 15, 'burst');
                spawnP(v.cx, v.cy, s.color, 15, 'burst');
                state.shockwaves.push({ x: v.srcX, y: v.srcY, r: 0, maxR: 40, life: 12, maxLife: 12, color: s.c2 });
                state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 40, life: 12, maxLife: 12, color: s.color });
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 80, color: s.core, int: 1.5, life: 10, ml: 10 });
                SoundFX.playTone(1200, 'sine', 0.08, 0.15);
                state.shake(5);
            }
            if (v.age > 20) {
                const idx = state.vfxSequences.indexOf(v);
                if (idx >= 0) state.vfxSequences.splice(idx, 1);
            }
        }
    },

    // ═══ GAMBIT: JOKER — Reflector shield ═══
    gambit_joker(v) {
        const s = v.spell;
        if (v.state === 0) {
            // Place shield at target
            v.state = 1; v.age = 0;
            v.shieldLife = 180; // 3 seconds
            state.player.castAnim = 280; state.player.castType = 'burst';
            SoundFX.playTone(600, 'triangle', 0.15, 0.15);
            spawnP(v.cx, v.cy, s.core, 10, 'burst');
            state.shake(3);
        } else if (v.state === 1) {
            v.shieldLife--;
            // Reflect projectiles that hit the shield
            const shieldR = 28;
            for (let i = state.projectiles.length - 1; i >= 0; i--) {
                const p = state.projectiles[i];
                const d = Math.hypot(p.x - v.cx, p.y - v.cy);
                if (d < shieldR + (p.growR || p.spell.r)) {
                    // Reflect! Reverse velocity + slight random scatter
                    p.vx = -p.vx + (Math.random() - .5) * 2;
                    p.vy = -p.vy + (Math.random() - .5) * 2;
                    p.x += p.vx * 3; p.y += p.vy * 3; // push away
                    spawnP(v.cx, v.cy, s.core, 6, 'burst');
                    state.shake(2);
                    SoundFX.playTone(900, 'square', 0.05, 0.08);
                }
            }
            // Ambient
            if (v.age % 6 === 0) {
                state.dynamicLights.push({ x: v.cx, y: v.cy, r: 40, color: s.core, int: 0.3, life: 4, ml: 4 });
            }
            if (v.shieldLife <= 0) {
                spawnP(v.cx, v.cy, s.color, 8, 'burst');
                const idx = state.vfxSequences.indexOf(v);
                if (idx >= 0) state.vfxSequences.splice(idx, 1);
            }
        }
    },
};

// ── VFX Drawers ────────────────────────────────────────────────────────────
export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW,
    dust_charge(v, X) {
        const s = v.spell;
        const T = performance.now() * 0.001;

        if (v.state === 0) {
            // ── Gathering vortex — swirling ring of sand particles ──
            const pr = Math.min(1, v.age / 20);
            const rings = 3;

            for (let ring = 0; ring < rings; ring++) {
                const rr = (25 + ring * 18) * pr;
                const count = 8 + ring * 4;
                X.globalAlpha = (0.4 - ring * 0.1) * pr;

                for (let i = 0; i < count; i++) {
                    const a = (i / count) * Math.PI * 2 + T * (3 - ring * 0.5) + ring;
                    const dx = Math.cos(a) * rr * (0.85 + Math.sin(T * 5 + i) * 0.15);
                    const dy = Math.sin(a) * rr * 0.4; // elliptical
                    const sz = 1.5 + Math.sin(T * 4 + i * 2) * 0.5;

                    X.fillStyle = i % 3 === 0 ? s.core : i % 3 === 1 ? s.color : s.c2;
                    X.beginPath();
                    X.arc(v.cx + dx, v.cy + dy, sz, 0, Math.PI * 2);
                    X.fill();
                }
            }

            // Central glow grows with charge
            const glowR = 8 + v.age * 0.3;
            const cg = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, glowR);
            cg.addColorStop(0, s.core); cg.addColorStop(0.3, s.color + '88');
            cg.addColorStop(1, 'transparent');
            X.fillStyle = cg; X.globalAlpha = 0.5 * pr;
            X.beginPath(); X.arc(v.cx, v.cy, glowR, 0, Math.PI * 2); X.fill();

            // Charge indicator bar (shows when rock will form)
            if (v.age > 10) {
                const pct = Math.min(1, v.age / v.spell.chargeTime);
                const barW = 30, barH = 3;
                X.globalAlpha = 0.6;
                X.fillStyle = '#222'; X.fillRect(v.cx - barW / 2, v.cy + 25, barW, barH);
                X.fillStyle = pct >= 1 ? s.core : s.color;
                X.fillRect(v.cx - barW / 2, v.cy + 25, barW * pct, barH);
                if (pct >= 1) {
                    X.fillStyle = s.core; X.globalAlpha = 0.3 + Math.sin(T * 10) * 0.2;
                    X.fillRect(v.cx - barW / 2 - 1, v.cy + 24, barW + 2, barH + 2);
                }
            }

            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // ── Rock forming — particles compressing into solid mass ──
            const pr = Math.min(1, v.age / 20);
            const rockR = 8 + pr * 10;

            // Compression ring
            const compR = 40 * (1 - pr);
            X.strokeStyle = s.color; X.lineWidth = 1.5;
            X.globalAlpha = 0.4 * (1 - pr);
            X.beginPath(); X.arc(v.cx, v.cy, compR, 0, Math.PI * 2); X.stroke();

            // Rock body: irregular polygon
            X.globalAlpha = 0.8 * pr;
            const rg = X.createRadialGradient(v.cx - 2, v.cy - 2, 0, v.cx, v.cy, rockR);
            rg.addColorStop(0, '#d4b878'); rg.addColorStop(0.4, s.color);
            rg.addColorStop(0.8, s.c2); rg.addColorStop(1, '#5a4020');
            X.fillStyle = rg;
            X.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + T * 0.5;
                const n = 0.8 + Math.sin(a * 3 + i) * 0.2;
                const px = v.cx + Math.cos(a) * rockR * n;
                const py = v.cy + Math.sin(a) * rockR * n;
                i === 0 ? X.moveTo(px, py) : X.lineTo(px, py);
            }
            X.closePath(); X.fill();

            // Cracks on rock surface
            X.strokeStyle = '#5a4020'; X.lineWidth = 0.8; X.globalAlpha = 0.5 * pr;
            for (let c = 0; c < 3; c++) {
                const ca = c * 2.1 + 0.5;
                X.beginPath();
                X.moveTo(v.cx + Math.cos(ca) * 2, v.cy + Math.sin(ca) * 2);
                X.lineTo(v.cx + Math.cos(ca) * rockR * 0.7, v.cy + Math.sin(ca) * rockR * 0.7);
                X.stroke();
            }

            // Glow
            X.globalAlpha = 0.3 * pr;
            const gg = X.createRadialGradient(v.cx, v.cy, rockR, v.cx, v.cy, rockR * 3);
            gg.addColorStop(0, s.core); gg.addColorStop(1, 'transparent');
            X.fillStyle = gg;
            X.beginPath(); X.arc(v.cx, v.cy, rockR * 3, 0, Math.PI * 2); X.fill();

            X.globalAlpha = 1;
        }
    },

    sandplosion_burst(v, X) {
        const s = v.spell;

        if (v.state === 0) {
            // Implosion lines converging — draw streaks toward center
            const pr = Math.min(1, v.age / v.delay);
            X.globalAlpha = 0.3 * pr;
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2 + v.age * 0.05;
                const d1 = 200 * (1 - pr), d2 = 20;
                X.strokeStyle = i % 2 ? s.color : s.core;
                X.lineWidth = 1 + (1 - pr) * 1.5;
                X.beginPath();
                X.moveTo(v.cx + Math.cos(a) * d1, v.cy + Math.sin(a) * d1);
                X.lineTo(v.cx + Math.cos(a) * d2, v.cy + Math.sin(a) * d2);
                X.stroke();
            }
            X.globalAlpha = 1;
        } else if (v.state === 1) {
            // Flash on burst
            if (v.age <= 3) {
                X.globalAlpha = Math.max(0, 0.3 - v.age * 0.1);
                X.fillStyle = s.core; X.fillRect(0, 0, state.W, state.H);
                X.globalAlpha = 1;
            }
        }
    },

    paradigma_prism(v, X) {
        const s = v.spell;
        const T = performance.now() * 0.001;
        const { cx, cy, geom } = getParadigmaPose(v, s);
        const fadeIn = v.state === 0 ? Math.min(1, v.age / 18) : 1;
        const fadeOut = v.state === 2 ? Math.max(0, 1 - v.age / 18) : 1;
        const fade = fadeIn * fadeOut;
        const fieldScale = 0.54 + Math.sin(T * 1.4 + (v.floatSeed || 0)) * 0.03;

        X.save();

        // Capture field
        X.save();
        X.translate(cx, cy + 10);
        X.scale(1, fieldScale);
        const halo = X.createRadialGradient(0, 0, s.prismFace * 0.3, 0, 0, s.prismR * 1.15);
        halo.addColorStop(0, s.core + '33');
        halo.addColorStop(0.45, s.color + '18');
        halo.addColorStop(1, 'transparent');
        X.fillStyle = halo;
        X.globalAlpha = 0.45 * fade;
        X.beginPath();
        X.arc(0, 0, s.prismR * 1.15, 0, Math.PI * 2);
        X.fill();
        X.strokeStyle = s.color;
        X.lineWidth = 1.2;
        X.setLineDash([6, 8]);
        X.globalAlpha = 0.26 * fade;
        X.beginPath();
        X.arc(0, 0, s.prismR, 0, Math.PI * 2);
        X.stroke();
        X.setLineDash([]);
        X.restore();

        // Stored spell motes
        const shown = Math.min(v.captured?.length || 0, 16);
        for (let i = 0; i < shown; i++) {
            const p = v.captured[i];
            const a = (i / Math.max(1, shown)) * Math.PI * 2 + T * 1.8 + (p._paradigmOrbit || 0);
            const r = 12 + (i % 3) * 8 + Math.sin(T * 4 + (p._paradigmPulse || 0)) * 2;
            const px = cx + Math.cos(a) * r * 0.95 + geom.dirx * 5;
            const py = cy - 10 + Math.sin(a) * r * 0.34 - (p._paradigmLift || 0);
            const col = p._paradigmColor || s.core;
            X.globalAlpha = 0.75 * fade;
            X.fillStyle = col;
            X.beginPath();
            X.arc(px, py, 2.3 + (i % 2), 0, Math.PI * 2);
            X.fill();
            X.globalAlpha = 0.25 * fade;
            X.strokeStyle = col;
            X.beginPath();
            X.moveTo(px, py);
            X.lineTo(geom.frontTip.x, geom.frontTip.y);
            X.stroke();
        }

        // Back prism face
        X.globalAlpha = 0.22 * fade;
        X.fillStyle = s.c2;
        drawPoly(X, geom.back);
        X.fill();
        X.strokeStyle = s.core;
        X.lineWidth = 1;
        X.stroke();

        // Side faces
        let grad = X.createLinearGradient(geom.backLeft.x, geom.backLeft.y, geom.frontTip.x, geom.frontTip.y);
        grad.addColorStop(0, s.c2 + '22');
        grad.addColorStop(1, s.core + '66');
        X.globalAlpha = 0.48 * fade;
        X.fillStyle = grad;
        drawPoly(X, geom.leftFace);
        X.fill();

        grad = X.createLinearGradient(geom.backRight.x, geom.backRight.y, geom.frontTip.x, geom.frontTip.y);
        grad.addColorStop(0, s.color + '18');
        grad.addColorStop(1, s.core + '70');
        X.fillStyle = grad;
        drawPoly(X, geom.rightFace);
        X.fill();

        // Base face shadow
        grad = X.createLinearGradient(geom.frontLeft.x, geom.frontLeft.y, geom.backRight.x, geom.backRight.y);
        grad.addColorStop(0, '#10203022');
        grad.addColorStop(1, s.color + '18');
        X.fillStyle = grad;
        X.globalAlpha = 0.22 * fade;
        drawPoly(X, geom.baseFace);
        X.fill();

        // Front face glass
        grad = X.createLinearGradient(geom.frontLeft.x, geom.frontLeft.y, geom.frontRight.x, geom.frontRight.y);
        grad.addColorStop(0, s.color + '55');
        grad.addColorStop(0.5, s.core + 'aa');
        grad.addColorStop(1, s.c2 + '55');
        X.fillStyle = grad;
        X.globalAlpha = 0.75 * fade;
        drawPoly(X, geom.front);
        X.fill();

        // Prism edges
        X.strokeStyle = s.core;
        X.lineWidth = 1.4;
        X.globalAlpha = 0.78 * fade;
        for (const poly of [geom.front, geom.back]) {
            drawPoly(X, poly);
            X.stroke();
        }
        for (const pair of [
            [geom.frontTip, geom.backTip],
            [geom.frontLeft, geom.backLeft],
            [geom.frontRight, geom.backRight],
        ]) {
            X.beginPath();
            X.moveTo(pair[0].x, pair[0].y);
            X.lineTo(pair[1].x, pair[1].y);
            X.stroke();
        }

        // Internal spectral split
        X.globalAlpha = 0.42 * fade;
        for (let i = 0; i < PRISM_SPECTRUM.length; i++) {
            const t = (i - 1.5) * 0.24;
            X.strokeStyle = PRISM_SPECTRUM[i];
            X.lineWidth = 1;
            X.beginPath();
            X.moveTo(
                geom.backTip.x + geom.perpx * t * s.prismFace,
                geom.backTip.y + geom.perpy * t * s.prismFace
            );
            X.lineTo(
                geom.frontLeft.x + (geom.frontRight.x - geom.frontLeft.x) * (0.18 + i * 0.2),
                geom.frontLeft.y + (geom.frontRight.y - geom.frontLeft.y) * (0.18 + i * 0.2)
            );
            X.stroke();
        }

        // Tip direction cue
        const beamLen = v.state === 2 ? 160 : 75;
        X.globalAlpha = (v.state === 2 ? 0.9 : 0.35) * fade;
        for (let i = 0; i < PRISM_SPECTRUM.length; i++) {
            const spread = (i - 1.5) * 4;
            X.strokeStyle = PRISM_SPECTRUM[i];
            X.lineWidth = v.state === 2 ? 2 : 1.1;
            X.beginPath();
            X.moveTo(geom.frontTip.x, geom.frontTip.y);
            X.lineTo(
                geom.frontTip.x + geom.dirx * beamLen + geom.perpx * spread,
                geom.frontTip.y + geom.diry * beamLen + geom.perpy * spread * 0.4
            );
            X.stroke();
        }

        // Front glow and stored count
        const coreGlow = X.createRadialGradient(geom.frontTip.x, geom.frontTip.y, 0, geom.frontTip.x, geom.frontTip.y, 36);
        coreGlow.addColorStop(0, '#ffffff');
        coreGlow.addColorStop(0.3, s.core);
        coreGlow.addColorStop(1, 'transparent');
        X.fillStyle = coreGlow;
        X.globalAlpha = 0.55 * fade;
        X.beginPath();
        X.arc(geom.frontTip.x, geom.frontTip.y, 36, 0, Math.PI * 2);
        X.fill();

        if ((v.captured?.length || 0) > 0 && v.state !== 2) {
            X.globalAlpha = 0.85 * fade;
            X.fillStyle = s.core;
            X.font = '10px monospace';
            X.textAlign = 'center';
            X.fillText(String(v.captured.length), cx, cy + s.prismFace + 18);
        }

        X.restore();
        X.globalAlpha = 1;
    },

    practical_effects(v, X) {
        const s = v.spell;
        const T = performance.now() * 0.001;
        const cx = v.cx;
        const cy = v.cy + Math.sin(v.age * 0.015 + (v.seed || 0)) * 2;
        const fadeIn = v.state === 0 ? Math.min(1, v.age / 18) : 1;
        const fadeOut = v.state === 3 ? Math.max(0, 1 - v.age / 30) : 1;
        const fade = fadeIn * fadeOut;
        const rigY = v.rigY ?? Math.max(24, cy - 150);
        const fixtureY = v.state === 2 ? (v.fixtureY ?? rigY + 22) : rigY + 22 + Math.sin(T * 3 + (v.seed || 0)) * 3;
        const groundY = cy + 52;

        X.save();

        // Ground mark and spotlight pool
        X.save();
        X.translate(cx, groundY);
        X.scale(1, 0.42);
        const pool = X.createRadialGradient(0, 0, s.rigR * 0.15, 0, 0, s.rigR);
        pool.addColorStop(0, s.core + '38');
        pool.addColorStop(0.55, s.color + '18');
        pool.addColorStop(1, 'transparent');
        X.fillStyle = pool;
        X.globalAlpha = 0.55 * fade;
        X.beginPath();
        X.arc(0, 0, s.rigR, 0, Math.PI * 2);
        X.fill();
        X.setLineDash([6, 8]);
        X.strokeStyle = s.color;
        X.lineWidth = 1.2;
        X.globalAlpha = 0.28 * fade;
        X.beginPath();
        X.arc(0, 0, s.rigR * 0.95, 0, Math.PI * 2);
        X.stroke();
        X.setLineDash([]);
        X.restore();

        // Spotlight cone
        const coneGrad = X.createLinearGradient(cx, rigY, cx, groundY);
        coneGrad.addColorStop(0, s.core + '66');
        coneGrad.addColorStop(0.35, s.core + '22');
        coneGrad.addColorStop(1, 'transparent');
        X.fillStyle = coneGrad;
        X.globalAlpha = 0.25 * fade;
        X.beginPath();
        X.moveTo(cx - 12, rigY + 18);
        X.lineTo(cx + 12, rigY + 18);
        X.lineTo(cx + s.rigR * 0.78, groundY + 6);
        X.lineTo(cx - s.rigR * 0.78, groundY + 6);
        X.closePath();
        X.fill();

        // Truss bar
        X.fillStyle = '#443828';
        X.globalAlpha = 0.9 * fade;
        X.fillRect(cx - 78, rigY - 8, 156, 10);
        X.strokeStyle = s.c2;
        X.lineWidth = 1;
        for (let i = -72; i <= 60; i += 24) {
            X.beginPath();
            X.moveTo(cx + i, rigY - 8);
            X.lineTo(cx + i + 24, rigY + 2);
            X.stroke();
            X.beginPath();
            X.moveTo(cx + i + 24, rigY - 8);
            X.lineTo(cx + i, rigY + 2);
            X.stroke();
        }

        // Fixture cables
        X.strokeStyle = '#b0a48a';
        X.globalAlpha = 0.45 * fade;
        X.beginPath();
        X.moveTo(cx - 8, rigY + 2);
        X.lineTo(cx - 8, fixtureY - 16);
        X.moveTo(cx + 8, rigY + 2);
        X.lineTo(cx + 8, fixtureY - 16);
        X.stroke();

        // Hanging spotlight fixture
        X.save();
        X.translate(cx, fixtureY);
        X.fillStyle = '#2b2a34';
        X.strokeStyle = s.c2;
        X.lineWidth = 1.2;
        X.globalAlpha = 0.92 * fade;
        X.beginPath();
        X.moveTo(-18, -14);
        X.lineTo(18, -14);
        X.lineTo(26, 10);
        X.lineTo(0, 18);
        X.lineTo(-26, 10);
        X.closePath();
        X.fill();
        X.stroke();
        const lens = X.createRadialGradient(0, 2, 2, 0, 2, 20);
        lens.addColorStop(0, '#ffffff');
        lens.addColorStop(0.3, s.core);
        lens.addColorStop(0.8, s.color);
        lens.addColorStop(1, 'transparent');
        X.fillStyle = lens;
        X.globalAlpha = 0.75 * fade;
        X.beginPath();
        X.arc(0, 2, 20, 0, Math.PI * 2);
        X.fill();
        X.restore();

        // Cables to targets
        if (v.targets?.length) {
            for (const target of v.targets) {
                const e = target.entity;
                if (!e?.active) continue;
                const ex = e.x + e.w / 2;
                const ey = e.y + e.h / 2;
                const sag = 10 + Math.sin(T * 3 + target.sway) * 5;
                X.strokeStyle = target.hookColor;
                X.lineWidth = 1.1;
                X.globalAlpha = 0.65 * fade;
                X.beginPath();
                X.moveTo(cx, fixtureY + 6);
                X.quadraticCurveTo((cx + ex) / 2, (fixtureY + ey) / 2 + sag, ex, ey);
                X.stroke();
                X.fillStyle = target.hookColor;
                X.globalAlpha = 0.8 * fade;
                X.beginPath();
                X.arc(ex, ey, 2.5, 0, Math.PI * 2);
                X.fill();
            }
        }

        // Release flash
        if (v.state === 3 && v.age < 6) {
            X.fillStyle = '#ffffff';
            X.globalAlpha = Math.max(0, 0.4 - v.age * 0.06);
            X.fillRect(0, 0, state.W, state.H);
        }

        X.restore();
        X.globalAlpha = 1;
    },

    dolly_zoom(v, X) {
        const s = v.spell;
        const T = performance.now() * 0.001;
        const fadeIn = v.state === 0 ? Math.min(1, v.age / 18) : 1;
        const fadeOut = v.state === 2 ? Math.max(0, 1 - v.age / 16) : 1;
        const fade = fadeIn * fadeOut;
        const pulse = 0.55 + Math.sin(T * 2.6 + (v.seed || 0)) * 0.18;

        X.save();
        X.globalAlpha = 0.12 * fade;
        X.fillStyle = '#000000';
        X.fillRect(0, 0, state.W, 26);
        X.fillRect(0, state.H - 26, state.W, 26);

        for (let i = 0; i < 6; i++) {
            const depth = i / 5;
            const wobble = Math.sin(T * 3 + i * 0.8 + v.age * 0.03) * 4;
            const w = 88 + depth * 280 + pulse * 38;
            const h = 54 + depth * 150 + pulse * 18;
            X.globalAlpha = (0.14 + depth * 0.08) * fade;
            X.strokeStyle = i % 2 === 0 ? s.c2 : s.color;
            X.lineWidth = 1.6;
            X.strokeRect(v.cx - w / 2, v.cy - h / 2 + wobble, w, h);
        }

        X.globalAlpha = 0.3 * fade;
        const tunnel = X.createRadialGradient(v.cx, v.cy, s.zoomLockR * 0.3, v.cx, v.cy, s.zoomR);
        tunnel.addColorStop(0, s.core + '44');
        tunnel.addColorStop(0.35, s.c2 + '18');
        tunnel.addColorStop(1, 'transparent');
        X.fillStyle = tunnel;
        X.beginPath();
        X.arc(v.cx, v.cy, s.zoomR, 0, Math.PI * 2);
        X.fill();

        X.globalAlpha = 0.85 * fade;
        X.strokeStyle = s.core;
        X.lineWidth = 2.2;
        X.beginPath();
        X.ellipse(v.cx, v.cy, s.zoomLockR, s.zoomLockR * 0.62, 0, 0, Math.PI * 2);
        X.stroke();

        X.globalAlpha = 0.55 * fade;
        X.strokeStyle = s.c2;
        X.beginPath();
        X.moveTo(v.cx - 18, v.cy);
        X.lineTo(v.cx + 18, v.cy);
        X.moveTo(v.cx, v.cy - 18);
        X.lineTo(v.cx, v.cy + 18);
        X.stroke();

        if (v.state === 2) {
            X.globalAlpha = Math.max(0, 0.28 - v.age * 0.015);
            X.fillStyle = '#ffffff';
            X.fillRect(0, 0, state.W, state.H);
        }

        X.restore();
        X.globalAlpha = 1;
    },

    final_cut(v, X) {
        const s = v.spell;
        X.save();

        if (v.state === 0) {
            X.globalAlpha = Math.min(0.35, v.age / 30);
            X.strokeStyle = s.core;
            X.lineWidth = 1.5;
            X.strokeRect(v.cx - 40, v.cy - 24, 80, 48);
        }

        if (v.history?.length) {
            X.globalAlpha = 0.18;
            X.strokeStyle = s.c2;
            X.lineWidth = 1;
            X.setLineDash([6, 8]);
            X.beginPath();
            X.moveTo(v.ox, v.oy);
            for (const point of v.history) X.lineTo(point.x, point.y);
            X.stroke();
            X.setLineDash([]);
        }

        for (const mark of v.marks || []) {
            const mx = mark.entity?.active ? mark.entity.x + mark.entity.w / 2 : mark.x;
            const my = mark.entity?.active ? mark.entity.y + mark.entity.h / 2 : mark.y;
            X.globalAlpha = 0.16;
            X.strokeStyle = s.core;
            X.strokeRect(mx - 16, my - 12, 32, 24);
        }

        for (const slash of v.slashes || []) drawFinalCutSlash(X, slash, s);

        if (v.state === 2) {
            X.globalAlpha = Math.max(0, 0.38 - v.age * 0.025);
            X.fillStyle = '#ffffff';
            X.fillRect(0, 0, state.W, state.H);
        }

        X.restore();
        X.globalAlpha = 1;
    },

    // ═══ TESSERACT — Quantum 4D Hypercube ═══
    tesseract(v, X) {
        const s = v.spell, T = performance.now() * 0.001;
        const size = s.tessSize * (v.unfoldProg ?? 1);
        if (size < 1) return;

        // 4D projection helper
        const r4 = v.rot4;
        function project4D(vert, scale) {
            let [x, y, z, w] = vert;
            let c, sn;
            c = Math.cos(r4[0]); sn = Math.sin(r4[0]);[x, y] = [x * c - y * sn, x * sn + y * c];
            c = Math.cos(r4[1]); sn = Math.sin(r4[1]);[x, z] = [x * c - z * sn, x * sn + z * c];
            c = Math.cos(r4[2]); sn = Math.sin(r4[2]);[x, w] = [x * c - w * sn, x * sn + w * c];
            c = Math.cos(r4[3]); sn = Math.sin(r4[3]);[y, z] = [y * c - z * sn, y * sn + z * c];
            c = Math.cos(r4[4]); sn = Math.sin(r4[4]);[y, w] = [y * c - w * sn, y * sn + w * c];
            c = Math.cos(r4[5]); sn = Math.sin(r4[5]);[z, w] = [z * c - w * sn, z * sn + w * c];
            const s4 = 2.5 / (2.5 - w), s3 = 4 / (4 - z * s4);
            return { px: x * s4 * s3 * scale, py: y * s4 * s3 * scale, w, s: s4 * s3 };
        }

        // Hypercube geometry
        const verts = [];
        for (let i = 0; i < 16; i++) verts.push([(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1), (i & 8 ? 1 : -1)]);
        const edges = [];
        for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) { const d = i ^ j; if (d && (d & (d - 1)) === 0) edges.push([i, j]); }

        // Draw a single hypercube wireframe at an offset
        function drawHypercube(ox, oy, scale, alpha) {
            const proj = verts.map(v4 => project4D(v4, scale));
            X.lineCap = 'round';
            for (const [i, j] of edges) {
                const a = proj[i], b = proj[j];
                const avgW = (a.w + b.w) * 0.5;
                const bright = 0.3 + (avgW + 1) * 0.35;
                X.strokeStyle = avgW > 0 ? s.color : s.c2;
                X.lineWidth = 0.8 + bright * 1.2;
                X.globalAlpha = bright * alpha;
                X.beginPath(); X.moveTo(ox + a.px, oy + a.py); X.lineTo(ox + b.px, oy + b.py); X.stroke();
            }
            for (const p of proj) {
                const bright = 0.3 + (p.w + 1) * 0.35;
                X.globalAlpha = bright * alpha * 0.8;
                X.fillStyle = p.w > 0 ? s.core : s.c2;
                X.beginPath(); X.arc(ox + p.px, oy + p.py, 1.5 + bright * 1.5, 0, Math.PI * 2); X.fill();
                X.globalAlpha = bright * alpha * 0.12;
                X.beginPath(); X.arc(ox + p.px, oy + p.py, 6 + bright * 4, 0, Math.PI * 2); X.fill();
            }
        }

        X.save(); X.translate(v.cx, v.cy);

        // ── |ψ|² Probability density rings ──
        const waveAlpha = (v.unfoldProg ?? 1) * 0.15;
        X.lineWidth = 1;
        for (let rr = 10; rr < s.tessPullR * (v.unfoldProg ?? 1); rr += 8) {
            const psi2 = Math.pow(Math.cos(rr * 0.08 + T * 3), 2);
            X.globalAlpha = psi2 * waveAlpha;
            X.strokeStyle = psi2 > 0.5 ? s.c2 : s.color;
            X.beginPath(); X.arc(0, 0, rr, 0, Math.PI * 2); X.stroke();
        }

        // ── Double-slit interference fringes ──
        X.globalAlpha = 0.04 * (v.unfoldProg ?? 1);
        const fringeCount = 12;
        for (let i = 0; i < fringeCount; i++) {
            const fringe = (i / fringeCount) * Math.PI * 2;
            const intensity = Math.pow(Math.cos(fringe * 3 + T * 2), 2);
            X.strokeStyle = intensity > 0.5 ? '#ff88ff' : '#88ffff';
            X.globalAlpha = intensity * 0.06 * (v.unfoldProg ?? 1);
            const angle = fringe;
            X.beginPath();
            X.moveTo(0, 0);
            X.lineTo(Math.cos(angle) * s.tessPullR, Math.sin(angle) * s.tessPullR);
            X.stroke();
        }

        // ── Quantum field aura ──
        const auraPulse = 0.4 + Math.sin(T * 2.5) * 0.15;
        const auraR = s.tessPullR * auraPulse * (v.unfoldProg ?? 1);
        const ag = X.createRadialGradient(0, 0, size * 0.3, 0, 0, auraR);
        ag.addColorStop(0, '#ff44ff22'); ag.addColorStop(0.3, s.color + '18');
        ag.addColorStop(0.6, s.c2 + '0a'); ag.addColorStop(1, 'transparent');
        X.fillStyle = ag; X.globalAlpha = 0.5;
        X.beginPath(); X.arc(0, 0, auraR, 0, Math.PI * 2); X.fill();

        // ── Ghost hypercubes in superposition ──
        if (v.ghosts) {
            for (const g of v.ghosts) {
                if (g.opacity < 0.05) continue;
                drawHypercube(g.ox, g.oy, size * 0.7, g.opacity * 0.5);
            }
        }

        // ── Main hypercube ──
        drawHypercube(0, 0, size, (v.unfoldProg ?? 1) * 0.85);

        // ── Entanglement strings between paired entities ──
        if (v.entangled && v.state === 1) {
            for (const [ea, eb] of v.entangled) {
                if (!ea?.active || !eb?.active) continue;
                const ax = ea.x + ea.w / 2 - v.cx, ay = ea.y + ea.h / 2 - v.cy;
                const bx = eb.x + eb.w / 2 - v.cx, by = eb.y + eb.h / 2 - v.cy;
                const entPulse = Math.sin(T * 6) * 0.3 + 0.5;

                // Entanglement Bézier
                X.strokeStyle = '#ff44ff'; X.lineWidth = 1.5; X.globalAlpha = 0.4 * entPulse;
                X.beginPath(); X.moveTo(ax, ay);
                X.quadraticCurveTo(0, 0, bx, by); X.stroke();
                // Second strand (complementary color)
                X.strokeStyle = '#44ffff'; X.lineWidth = 1; X.globalAlpha = 0.3 * entPulse;
                X.setLineDash([4, 6]);
                X.beginPath(); X.moveTo(ax, ay);
                X.quadraticCurveTo((ax + bx) * 0.5 + Math.sin(T * 4) * 20, (ay + by) * 0.5 + Math.cos(T * 3) * 20, bx, by);
                X.stroke(); X.setLineDash([]);
                // Entanglement nodes
                for (const [nx, ny, col] of [[ax, ay, '#ff44ff'], [bx, by, '#44ffff']]) {
                    X.fillStyle = col; X.globalAlpha = 0.6 * entPulse;
                    X.beginPath(); X.arc(nx, ny, 3, 0, Math.PI * 2); X.fill();
                    X.globalAlpha = 0.1 * entPulse;
                    X.beginPath(); X.arc(nx, ny, 10, 0, Math.PI * 2); X.fill();
                }
            }
        }

        // ── Planck-scale quantum foam (tiny jittering dots) ──
        if (v.state === 1 || v.state === 0) {
            X.globalAlpha = 0.2 * (v.unfoldProg ?? 1);
            for (let i = 0; i < 20; i++) {
                const fx = (Math.sin(T * 7 + i * 1.7) + Math.cos(T * 11 + i * 2.3)) * size;
                const fy = (Math.cos(T * 9 + i * 1.3) + Math.sin(T * 13 + i * 1.9)) * size;
                X.fillStyle = i % 3 === 0 ? '#ff44ff' : i % 3 === 1 ? '#44ffff' : s.core;
                X.fillRect(fx - 0.5, fy - 0.5, 1, 1);
            }
        }

        // ── Schrödinger equation text (faint) ──
        X.globalAlpha = 0.12 * (v.unfoldProg ?? 1);
        X.font = '8px monospace'; X.textAlign = 'center'; X.textBaseline = 'middle';
        X.fillStyle = s.c2;
        X.fillText('iℏ∂ψ/∂t = Ĥψ', 0, -size - 12);
        X.fillText('|ψ⟩ = Σαᵢ|φᵢ⟩', 0, size + 14);

        // ── Observer count indicator ──
        if (v.observerCount > 0 && v.state === 1) {
            X.globalAlpha = 0.3;
            X.font = '6px monospace'; X.fillStyle = '#ff44ff';
            X.fillText(`observers: ${v.observerCount}`, 0, -size - 22);
        }

        // ── Collapse flash ──
        if (v.state === 2 && v.age < 8) {
            X.globalAlpha = Math.max(0, 0.5 - v.age * 0.06);
            X.fillStyle = '#ffffff';
            X.fillRect(-state.W, -state.H, state.W * 2, state.H * 2);
        }

        X.restore(); X.globalAlpha = 1;
    },

    // ═══ GAMBIT: ACE — Giant flying card ═══
    gambit_ace(v, X) {
        if (v.state !== 1) return;
        const s = v.spell, T = performance.now() * 0.001;
        const CW = 24, CH = 36; // half-sizes for card
        X.save(); X.translate(v.px, v.py); X.rotate(v.angle + Math.sin(T * 12) * 0.08);
        // Card shadow
        X.globalAlpha = 0.2; X.fillStyle = '#000';
        X.fillRect(-CW - 2, -CH - 2, CW * 2 + 4, CH * 2 + 4);
        // Card body - dark gradient
        X.globalAlpha = 0.95;
        const cg = X.createLinearGradient(-CW, -CH, CW, CH);
        cg.addColorStop(0, '#1a1a1a'); cg.addColorStop(0.5, '#333'); cg.addColorStop(1, '#1a1a1a');
        X.fillStyle = cg;
        X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 4); X.fill();
        // Border - white glow
        X.strokeStyle = '#fff'; X.lineWidth = 2;
        X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 4); X.stroke();
        // Inner border
        X.strokeStyle = '#666'; X.lineWidth = 0.5;
        X.beginPath(); X.roundRect(-CW + 4, -CH + 4, (CW - 4) * 2, (CH - 4) * 2, 2); X.stroke();
        // Big spade symbol center
        X.fillStyle = '#fff'; X.font = 'bold 30px serif'; X.textAlign = 'center'; X.textBaseline = 'middle';
        X.fillText('♠', 0, 0);
        // Corner labels
        X.font = 'bold 10px serif';
        X.fillText('A', -CW + 8, -CH + 10);
        X.save(); X.rotate(Math.PI); X.fillText('A', -CW + 8, -CH + 10); X.restore();
        // Cut trail glow - large
        X.globalAlpha = 0.35;
        const tg = X.createLinearGradient(CW, 0, CW + 80, 0);
        tg.addColorStop(0, '#fff'); tg.addColorStop(1, 'transparent');
        X.fillStyle = tg; X.fillRect(CW, -16, 80, 32);
        X.restore(); X.globalAlpha = 1;
    },

    // ═══ GAMBIT: QUEEN — Portal ═══
    gambit_queen(v, X) {
        const s = v.spell, T = performance.now() * 0.001;
        if (v.state === 1 || v.state === 2) {
            const pr = v.state === 1 ? Math.min(1, v.age / 20) : Math.max(0, 1 - v.age / 15);
            const CW = 24 * pr, CH = 36 * pr; // card half-sizes scaled by progress
            // Source portal — card-shaped
            if (v.target) {
                X.save(); X.translate(v.srcX, v.srcY - 5);
                X.rotate(Math.PI * 0.05 * Math.sin(T * 3));
                // Card body
                X.globalAlpha = 0.7 * pr;
                const sg = X.createLinearGradient(-CW, -CH, CW, CH);
                sg.addColorStop(0, '#880033'); sg.addColorStop(0.5, s.c2); sg.addColorStop(1, '#880033');
                X.fillStyle = sg;
                if (CW > 1) { X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 3 * pr); X.fill(); }
                X.strokeStyle = s.core; X.lineWidth = 1.5;
                if (CW > 1) { X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 3 * pr); X.stroke(); }
                // Queen symbol
                X.fillStyle = s.core; X.font = `bold ${24 * pr}px serif`;
                X.textAlign = 'center'; X.textBaseline = 'middle';
                X.globalAlpha = 0.9 * pr; X.fillText('♛', 0, 0);
                X.font = `bold ${8 * pr}px serif`; X.fillText('Q', -CW + 6 * pr, -CH + 8 * pr);
                X.restore();
            }
            // Destination portal — card-shaped
            X.save(); X.translate(v.cx, v.cy - 5);
            X.rotate(-Math.PI * 0.05 * Math.sin(T * 3 + 1));
            X.globalAlpha = 0.7 * pr;
            const dg = X.createLinearGradient(-CW, -CH, CW, CH);
            dg.addColorStop(0, '#880033'); dg.addColorStop(0.5, s.color); dg.addColorStop(1, '#880033');
            X.fillStyle = dg;
            if (CW > 1) { X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 3 * pr); X.fill(); }
            X.strokeStyle = s.core; X.lineWidth = 1.5;
            if (CW > 1) { X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 3 * pr); X.stroke(); }
            X.fillStyle = s.core; X.font = `bold ${24 * pr}px serif`;
            X.textAlign = 'center'; X.textBaseline = 'middle';
            X.globalAlpha = 0.9 * pr; X.fillText('♛', 0, 0);
            X.font = `bold ${8 * pr}px serif`; X.fillText('Q', -CW + 6 * pr, -CH + 8 * pr);
            X.restore();
            // Connection line
            if (v.target && v.state === 1) {
                X.strokeStyle = s.core; X.lineWidth = 1.5;
                X.globalAlpha = 0.2 * pr; X.setLineDash([6, 8]);
                X.beginPath(); X.moveTo(v.srcX, v.srcY); X.lineTo(v.cx, v.cy); X.stroke();
                X.setLineDash([]);
            }
            X.globalAlpha = 1;
        }
    },

    // ═══ GAMBIT: JOKER — Reflector shield ═══
    gambit_joker(v, X) {
        if (v.state !== 1) return;
        const s = v.spell, T = performance.now() * 0.001;
        const life = v.shieldLife / 180;
        const pulse = 0.9 + Math.sin(T * 4) * 0.1;
        const bob = Math.sin(T * 2) * 4;
        const CW = 24, CH = 36; // same card half-sizes
        X.save(); X.translate(v.cx, v.cy + bob);
        X.rotate(Math.sin(T * 1.5) * 0.06);
        // Shield aura around card
        const auraR = 50 * pulse;
        const sg = X.createRadialGradient(0, 0, CW * 0.5, 0, 0, auraR);
        sg.addColorStop(0, s.core + '55'); sg.addColorStop(0.5, s.color + '22'); sg.addColorStop(1, 'transparent');
        X.fillStyle = sg; X.globalAlpha = 0.5 * life;
        X.beginPath(); X.arc(0, 0, auraR, 0, Math.PI * 2); X.fill();
        // Card shadow
        X.globalAlpha = 0.15 * life; X.fillStyle = '#000';
        X.fillRect(-CW - 2, -CH - 2, CW * 2 + 4, CH * 2 + 4);
        // Card body
        X.globalAlpha = 0.9 * life;
        const cg = X.createLinearGradient(-CW, -CH, CW, CH);
        cg.addColorStop(0, '#660022'); cg.addColorStop(0.5, s.color); cg.addColorStop(1, '#660022');
        X.fillStyle = cg;
        X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 4); X.fill();
        // Border
        X.strokeStyle = s.core; X.lineWidth = 2;
        X.beginPath(); X.roundRect(-CW, -CH, CW * 2, CH * 2, 4); X.stroke();
        // Inner border
        X.strokeStyle = s.c2; X.lineWidth = 0.5;
        X.beginPath(); X.roundRect(-CW + 4, -CH + 4, (CW - 4) * 2, (CH - 4) * 2, 2); X.stroke();
        // Joker symbol
        X.fillStyle = s.core; X.font = 'bold 26px serif'; X.textAlign = 'center'; X.textBaseline = 'middle';
        X.globalAlpha = 0.9 * life; X.fillText('🃏', 0, 0);
        // Corner labels
        X.font = 'bold 10px serif'; X.fillStyle = s.core;
        X.fillText('J', -CW + 8, -CH + 10);
        X.save(); X.rotate(Math.PI); X.fillText('J', -CW + 8, -CH + 10); X.restore();
        // Orbiting diamonds
        X.font = '10px serif';
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + T * 2;
            const orbitR = CW + 12;
            X.fillStyle = s.c2; X.globalAlpha = 0.6 * life;
            X.fillText('♦', Math.cos(a) * orbitR, Math.sin(a) * orbitR);
        }
        X.restore(); X.globalAlpha = 1;
    },
};
