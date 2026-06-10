// echolith-hold.js — Echolith school spell (Hold)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { drawEcholithSigil } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Confessional Maw',
  icon: '⚖',
  key: '2',
  category: 'Hold',
  color: '#fff0a8',
  c2: '#7d0b16',
  core: '#fff8df',
  speed: 0,
  dmg: 4,
  mana: 20,
  cd: 900,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithHold: true,
  echolithSide: 'threshold',
  holdR: 92,
  holdPull: 0.34,
  holdDrain: 0.23,
  releaseR: 108,
  releaseDmg: 26,
  desc: 'Channel a confession circle where sin and mercy argue, then release a verdict blast',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clampPoint(x, y, pad = 26) {
  return {
    x: Math.max(pad, Math.min(state.W - pad, x)),
    y: Math.max(pad, Math.min(state.H - pad, y)),
  };
}

function casterOrigin() {
  return {
    x: state.player.x + state.player.w / 2 + state.player.facing * 10,
    y: state.player.y + 8,
  };
}

export const FIRE_HANDLERS = {
  isEcholithHold(s, ox, oy, tx, ty) {
    const active = state.vfxSequences.find((v) => v.type === 'echolith_hold' && v.state === 0);
    if (active) {
      active.state = 1;
      active.age = 0;
      return true;
    }

    const pt = clampPoint(tx, ty, Math.max(26, (s.holdR || 90) * 0.3));
    state.vfxSequences.push({
      type: 'echolith_hold',
      state: 0,
      age: 0,
      spell: s,
      cx: pt.x,
      cy: pt.y,
      ox,
      oy,
      phase: Math.random() * Math.PI * 2,
      charge: 0,
      prepScale: 1,
      lastTargets: [],
    });

    SoundFX.playSweep(130, 780, 'triangle', 0.14, 0.12);
    spawnP(pt.x, pt.y, s.c2, 8, 'sparkle');
    state.dynamicLights.push({ x: pt.x, y: pt.y, r: s.holdR, color: s.core, int: 1.2, life: 8, ml: 8 });
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_hold(v) {
    const s = v.spell;
    const origin = casterOrigin();
    v.ox = origin.x;
    v.oy = origin.y;
    v.phase += 0.09;

    if (v.state === 0) {
      if (!state.mouse?.down) {
        v.state = 1;
        v.age = 0;
      } else {
        const n = clampPoint(state.mouse.x, state.mouse.y, Math.max(26, (s.holdR || 90) * 0.3));
        v.cx += (n.x - v.cx) * 0.36;
        v.cy += (n.y - v.cy) * 0.36;
      }

      state.player.castAnim = 280;
      state.player.castType = 'channel';
      state.player.staffGlow = 250;
      state.player.sq = 1.12;
      state.player.st = 1 / state.player.sq;

      if (v.age % 3 === 0) {
        state.player.mana = Math.max(0, state.player.mana - (s.holdDrain || 0.22));
        if (state.player.mana <= 0.1) {
          v.state = 1;
          v.age = 0;
        }
      }

      const pulse = Math.sin(v.phase * 1.1) * 0.5 + 0.5;
      v.lastTargets = [];
      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = v.cx - ex;
        const dy = v.cy - ey;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > s.holdR) continue;

        const k = Math.max(0, 1 - dist / s.holdR);
        const tang = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(v.phase + dist * 0.03) * 0.25;
        const pull = (s.holdPull || 0.32) * k;

        e.vx += (dx / dist) * pull * (0.35 + pulse * 0.3) + Math.cos(tang) * pull * 0.88;
        e.vy += (dy / dist) * pull * (0.25 + pulse * 0.28) + Math.sin(tang) * pull * 0.7 - 0.16;
        e.vx *= 0.92;
        e.vy *= 0.95;

        if (v.age % 9 === 0) hurtEntity(e, s.dmg, v.cx, v.cy);
        v.lastTargets.push(e);

        if (v.age % 3 === 0) {
          spawnP(ex, ey, s.color, 1, 'trail');
          spawnP(ex, ey, s.c2, 1, 'sparkle');
        }
      }

      for (const p of state.projectiles) {
        const dx = v.cx - p.x;
        const dy = v.cy - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > s.holdR + 24) continue;

        const k = Math.max(0, 1 - dist / (s.holdR + 24));
        const tang = Math.atan2(dy, dx) + Math.PI / 2;
        p.vx += Math.cos(tang) * 0.22 * k + (dx / dist) * 0.06 * k;
        p.vy += Math.sin(tang) * 0.22 * k + (dy / dist) * 0.06 * k;
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = s.holdR * (0.35 + Math.random() * 0.65);
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.8, Math.random() > 0.5 ? s.c2 : s.color, 1, 'sparkle');
      }

      state.dynamicLights.push({
        x: v.cx,
        y: v.cy,
        r: s.holdR * (1.03 + pulse * 0.06),
        color: s.core,
        int: 0.9 + pulse * 0.25,
        life: 2,
        ml: 2,
      });
      if (v.age % 8 === 0) state.shake(0.45 + pulse * 0.55);
      return;
    }

    if (v.state === 1) {
      if (v.age === 0) {
        SoundFX.playSweep(240, 90, 'sawtooth', 0.16, 0.12);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.holdR * 0.4, life: 7, maxLife: 7, color: s.c2 });
      }

      v.prepScale = Math.max(0.2, 1 - v.age / 12);

      for (const e of v.lastTargets || []) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = v.cx - ex;
        const dy = v.cy - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, 1 - dist / (s.holdR * 1.1));
        e.vx += (dx / dist) * (1.3 * k) / (e.mass || 1);
        e.vy += (dy / dist) * (0.9 * k) / (e.mass || 1) - 0.08;
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const rr = s.holdR * (0.4 + Math.random() * 0.5) * v.prepScale;
        const sx = v.cx + Math.cos(a) * rr;
        const sy = v.cy + Math.sin(a) * rr * 0.8;
        state.particles.push({
          x: sx,
          y: sy,
          vx: (v.cx - sx) * 0.08,
          vy: (v.cy - sy) * 0.08,
          life: 15,
          ml: 15,
          color: Math.random() > 0.5 ? s.core : s.c2,
          size: 1.6,
          grav: -0.01,
          type: 'trail',
        });
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.holdR * (0.75 + v.prepScale * 0.25), color: s.core, int: 1.3, life: 2, ml: 2 });
      state.shake(1.2);

      if (v.age > 12) {
        v.state = 2;
        v.age = 0;
      }
      return;
    }

    if (!v.released) {
      v.released = true;
      const bonus = Math.min(14, (v.lastTargets?.length || 0) * 1.7);
      explode(v.cx, v.cy, s.releaseR, 10, s.releaseDmg + bonus, s.color, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.releaseR * 1.2, life: 11, maxLife: 11, color: s.core });
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.releaseR * 1.55, life: 16, maxLife: 16, color: s.c2 });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.releaseR * 1.35, color: '#ffffff', int: 2.8, life: 6, ml: 6 });

      for (const e of v.lastTargets || []) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const dx = ex - v.cx;
        const dy = ey - v.cy;
        const dist = Math.hypot(dx, dy) || 1;
        e.vx += (dx / dist) * 10 / (e.mass || 1);
        e.vy += (dy / dist) * 6.2 / (e.mass || 1) - 1.25;
      }

      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        const sp = 3 + Math.random() * 5;
        state.particles.push({
          x: v.cx,
          y: v.cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 22 + Math.floor(Math.random() * 14),
          ml: 36,
          color: i % 3 === 0 ? s.core : (i % 2 ? s.c2 : s.color),
          size: 1.8 + Math.random() * 1.8,
          grav: 0.05,
          type: 'sparkle',
        });
      }

      SoundFX.playSweep(90, 1700, 'sawtooth', 0.22, 0.12);
      SoundFX.playNoise(0.16, 0.08, 430, 'bandpass', 6);
      state.shake(10);
    }

    if (v.age > 18) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_hold(v, X) {
    const s = v.spell;
    const p = v.phase || 0;
    const prep = v.state === 1 ? (v.prepScale || 1) : 1;
    const burstAfter = v.state === 2 ? Math.min(1, v.age / 18) : 0;
    const rx = s.holdR * (1.02 + Math.sin(p * 0.6) * 0.03) * prep;
    const ry = s.holdR * 0.74 * prep;

    X.save();
    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.16 + burstAfter * 0.14;
    X.fillStyle = s.color;
    X.beginPath();
    X.ellipse(0, 0, rx * (1 + burstAfter * 0.5), ry * (1 + burstAfter * 0.45), p * 0.2, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.75;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.setLineDash([7, 5]);
    X.lineDashOffset = -p * 10;
    X.beginPath();
    X.ellipse(0, 0, rx, ry, p * 0.2, 0, Math.PI * 2);
    X.stroke();

    X.setLineDash([3, 8]);
    X.lineDashOffset = p * 14;
    X.globalAlpha = 0.42;
    X.strokeStyle = s.core;
    X.lineWidth = 1.4;
    X.beginPath();
    X.ellipse(0, 0, rx * 0.72, ry * 0.56, -p * 0.26, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);

    drawEcholithSigil(X, 'threshold', 0, 0, 30 * prep * (1 + burstAfter * 0.35), p, {
      good: s.color,
      evil: s.c2,
      core: s.core,
    });

    const segs = v.state === 2 ? 14 : 10;
    for (let i = 0; i < segs; i++) {
      const a = p * (1.1 + burstAfter * 0.7) + (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * rx * (0.76 + burstAfter * 0.55);
      const y = Math.sin(a) * ry * (0.76 + burstAfter * 0.55);
      const nx = Math.cos(a);
      const ny = Math.sin(a);

      X.globalAlpha = 0.76;
      X.strokeStyle = i % 2 === 0 ? s.color : s.c2;
      X.lineWidth = 1.6 + burstAfter * 1.4;
      X.beginPath();
      X.moveTo(x - nx * 6, y - ny * 6);
      X.lineTo(x + nx * 7, y + ny * 7);
      X.stroke();
    }

    X.restore();

    X.save();
    X.globalAlpha = 0.35;
    X.strokeStyle = s.core;
    X.lineWidth = 1.5;
    X.beginPath();
    X.moveTo(v.ox, v.oy);
    X.lineTo(v.cx, v.cy);
    X.stroke();

    let links = 0;
    for (const e of v.lastTargets || []) {
      if (!e.active) continue;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      X.globalAlpha = 0.18 + Math.sin(p + links) * 0.08;
      X.strokeStyle = links % 2 === 0 ? s.c2 : s.color;
      X.lineWidth = 1.1;
      X.beginPath();
      X.moveTo(v.cx, v.cy);
      X.lineTo(ex, ey);
      X.stroke();
      links += 1;
      if (links >= 6) break;
    }

    X.restore();
  },
};
