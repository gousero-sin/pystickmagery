// fire.js — Fire & Heat Spells Module
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
    { name: 'Fireball', icon: '🔥', key: '1', color: '#ff5511', c2: '#ff8833', core: '#ffe844', speed: 7, dmg: 22, mana: 12, cd: 300, r: 5, grav: .15, drag: .997, bounce: 0, exR: 45, exF: 8, trail: 'fire', desc: 'Explosive blast radius' },
    { name: 'Flame Wall', icon: '🧱', key: 'E', color: '#ff4400', c2: '#ff8822', core: '#ffcc44', speed: 0, dmg: 8, mana: 22, cd: 800, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isWall: true, wallW: 80, wallH: 40, wallDur: 200, desc: 'Creates a wall of fire' },
    { name: 'Cluster Bomb', icon: '🎆', key: 'I', color: '#ff6644', c2: '#ff9966', core: '#ffcc88', speed: 6, dmg: 8, mana: 22, cd: 500, r: 4, grav: .18, drag: .998, bounce: 0, exR: 20, exF: 4, trail: 'fire', isCluster: true, subCount: 6, subSpd: 5, subDmg: 12, subR: 18, desc: 'Splits into 6 sub-bombs' },
    { name: 'Time Bomb', icon: '⏱️', key: 'U', color: '#ffaa00', c2: '#ffcc44', core: '#fff', speed: 5, dmg: 0, mana: 20, cd: 600, r: 5, grav: .2, drag: .998, bounce: 0, exR: 0, exF: 0, trail: 'clock', isTimeBomb: true, bombDelay: 120, bombDmg: 50, bombR: 65, bombF: 12, desc: 'Sticks then detonates — huge' },
    { name: 'Meteor', icon: '☄️', key: '6', color: '#ff6600', c2: '#ffaa33', core: '#ffdd66', speed: 0, dmg: 45, mana: 40, cd: 1500, r: 12, grav: .5, drag: .999, bounce: 0, exR: 70, exF: 14, trail: 'meteor', isMeteor: true, desc: 'Devastating sky strike' },
    createManifestSpell({
        name: 'Cinder Rampart', icon: '♨️',
        color: '#ff5c1c', c2: '#ff9b40', core: '#fff0a8',
        manifestStyle: 'fire', manifestEffect: 'fire_burn', manifestProfile: 'rampart', manifestGlyph: '+',
        manifestDuration: 720,
        mana: 26, cd: 950, manifestArc: 10, manifestThickness: 12, manifestSegmentHp: 30, manifestPulseDmg: 4,
        desc: 'Manifest a cinder barricade that scorches and then collapses'
    }),
    { name: 'Cataclysm', icon: '🌋', key: 'V', color: '#ff2200', c2: '#ff8800', core: '#ffcc00', speed: 0, dmg: 150, mana: 80, cd: 8000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'fire', isCataclysm: true, exR: 150, exF: 25, desc: 'Massive eruption (Ultimate)' }
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
    ...MANIFEST_FIRE_HANDLERS,
    isMeteor(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'meteor', state: 0, age: 0, tx, ty, spell: s });
        spawnP(ox, oy, s.color, 12, 'burst');
        return true;
    },
    isWall(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'firewall', state: 0, age: 0, tx, ty, spell: s });
        return true;
    },
    isCataclysm(s, ox, oy, tx, ty) {
        state.vfxSequences.push({ type: 'cataclysm', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, tx, ty, spell: s });
        state.player.inv = true;
        return true;
    }
};

// ── Projectile Hooks ───────────────────────────────────────────────────────
export const PROJ_HOOKS = {
    isCluster: {
        onLand(p, s, hitPlat, hitEntity) {
            for (let k = 0; k < s.subCount; k++) {
                const a = k / s.subCount * Math.PI * 2;
                state.projectiles.push({
                    x: p.x, y: p.y, vx: Math.cos(a) * s.subSpd, vy: Math.sin(a) * s.subSpd - 2, spell: { ...s, isCluster: false, _hook: null }, life: 100, age: 0, trail: [], hitList: [], bounces: 2, subProj: true, growR: s.subR, growDmg: s.subDmg
                });
            }
        }
    },
    isTimeBomb: {
        onLand(p, s, hitPlat, hitEntity) {
            state.timeBombs.push({ x: p.x, y: p.y, target: hitEntity ? hitEntity : null, offset: hitEntity ? { x: p.x - hitEntity.x, y: p.y - hitEntity.y } : null, delay: s.bombDelay, age: 0, dmg: s.bombDmg, r: s.bombR, f: s.bombF, color: s.color, core: s.core });
        }
    }
};

// ── VFX Updaters ───────────────────────────────────────────────────────────
// meteor, firewall, cataclysm are handled inline in arcane-modular.html
export const VFX_UPDATE = {
    ...MANIFEST_VFX_UPDATE
};

// ── VFX Drawers ────────────────────────────────────────────────────────────
export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW,
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
