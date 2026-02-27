// ═══════════════════════════════════════════════════════════════════════════
// holy.js — Holy & Light Spell School
// ═══════════════════════════════════════════════════════════════════════════
import { state, W, H } from '../core/state.js?v=7';
import { spawnP, explode, hurtEntity } from '../core/utils.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=7';

export const SPELL_DEFS = [
    createManifestSpell({
        name: 'Sanctuary Steps', icon: '🕊️',
        color: '#e7d46a', c2: '#fff0a8', core: '#ffffff',
        manifestStyle: 'holy', manifestEffect: 'holy_grace', manifestProfile: 'steps', manifestGlyph: '+',
        manifestDuration: 960,
        mana: 26, cd: 950, manifestArc: 18, manifestThickness: 10, manifestSegmentHp: 36, manifestHeal: 1.2,
        desc: 'Manifest radiant steps that heal allies, repel foes, and fade gently away'
    }),
    { name: 'Judgment', icon: '✨', key: 'M', color: '#ffee66', c2: '#ffffaa', core: '#ffffff', speed: 0, dmg: 130, mana: 85, cd: 7000, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'holy', isJudgment: true, desc: 'Divine orbital strike (Ultimate)' }
];

export const FIRE_HANDLERS = {
    ...MANIFEST_FIRE_HANDLERS,
    isJudgment: (s, ox, oy, tx, ty) => {
        SoundFX.playTone(800, 'sine', 0.4, 0.2); SoundFX.playTone(1600, 'sine', 0.4, 0.2);
        state.vfxSequences.push({ type: 'judgment', state: 0, age: 0, cx: state.player.x + state.player.w / 2, cy: state.player.y + state.player.h / 2, spell: s });
        state.player.inv = true;
        return true;
    }
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
    ...MANIFEST_VFX_UPDATE,
    'judgment': (v) => {
        const s = v.spell;
        if (v.state === 0) {
            v.targets = []; for (const e of state.entities) { if (e.active && e.hp > 0) v.targets.push(e); }
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
    }
};

export const VFX_DRAW = {
    ...MANIFEST_VFX_DRAW,
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
    }
};
