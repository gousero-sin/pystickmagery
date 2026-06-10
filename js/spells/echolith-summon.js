// echolith-summon.js — Echolith school spell (Summon)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, explode } from '../core/utils.js?v=7';
import { drawEcholithHalo, drawEcholithHorns, drawEcholithScale } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Twin Altar',
  icon: '⛧',
  key: '3',
  category: 'Summon',
  color: '#f4d36a',
  c2: '#8f0713',
  core: '#fff8df',
  speed: 0,
  dmg: 12,
  mana: 30,
  cd: 1450,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithSummon: true,
  echolithSide: 'threshold',
  summonDur: 420,
  summonR: 180,
  pulseEvery: 28,
  pulseForce: 1.05,
  desc: 'Raise a split altar: angel light on one side, demon teeth on the other, judging nearby souls',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function nearestEnemy(x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.entities) {
    if (!e.active) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const d = Math.hypot(ex - x, ey - y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export const FIRE_HANDLERS = {
  isEcholithSummon(s, ox, oy, tx, ty) {
    const cx = clamp(tx, 56, state.W - 56);
    const cy = clamp(ty, 95, state.H - 64);

    state.vfxSequences.push({
      type: 'echolith_summon_obelisk',
      state: 0,
      age: 0,
      cx,
      cy,
      spell: s,
      phase: Math.random() * Math.PI * 2,
      ringPulse: [],
      strikes: [],
      life: s.summonDur,
      rise: 0,
    });

    spawnP(cx, cy, s.c2, 10, 'sparkle');
    spawnP(cx, cy, s.color, 12, 'burst');
    state.dynamicLights.push({ x: cx, y: cy, r: 120, color: s.core, int: 1.6, life: 10, ml: 10 });
    SoundFX.playSweep(110, 900, 'triangle', 0.25, 0.2);
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_summon_obelisk(v) {
    const s = v.spell;
    v.phase += 0.08;

    if (v.state === 0) {
      v.rise = Math.min(1, v.age / 18);

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 14 + Math.random() * 26;
        spawnP(v.cx + Math.cos(a) * r, v.cy - 12 + Math.sin(a) * r, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
      }

      state.dynamicLights.push({
        x: v.cx,
        y: v.cy - 16,
        r: 80 + v.rise * 70,
        color: s.core,
        int: 1 + v.rise * 0.8,
        life: 2,
        ml: 2,
      });

      if (v.age > 18) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(900, 220, 'sawtooth', 0.16, 0.12);
      }
      return;
    }

    if (v.state === 1) {
      v.life -= 1;

      // Twin altar pulse: the ritual judges everything near the boundary.
      if (v.age % s.pulseEvery === 0) {
        v.ringPulse.push({ r: 0, maxR: s.summonR * 0.9, life: 16, maxLife: 16 });
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.summonR * 0.72, life: 10, maxLife: 10, color: s.c2 });
        SoundFX.playTone(360 + Math.random() * 160, 'sine', 0.1, 0.1);

        for (const e of state.entities) {
          if (!e.active) continue;
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          const dx = ex - v.cx;
          const dy = ey - v.cy;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > s.summonR) continue;

          const k = Math.max(0, 1 - dist / s.summonR);
          hurtEntity(e, Math.max(2, Math.floor(s.dmg * k)), v.cx, v.cy);
          e.vx += (dx / dist) * (s.pulseForce * 8 * k) / (e.mass || 1);
          e.vy += (dy / dist) * (s.pulseForce * 5 * k) / (e.mass || 1) - 0.9;
        }
      }

      // Judgment tether on nearest enemy: cinematic angel/demon chord.
      if (v.age % 12 === 0) {
        const t = nearestEnemy(v.cx, v.cy, s.summonR + 46);
        if (t) {
          const tx = t.x + t.w / 2;
          const ty = t.y + t.h / 2;
          const mx = (v.cx + tx) * 0.5 + (Math.random() - 0.5) * 26;
          const my = (v.cy + ty) * 0.5 + (Math.random() - 0.5) * 26;
          const segments = [
            { x: v.cx, y: v.cy - 28 },
            { x: mx, y: my },
            { x: tx, y: ty },
          ];
          state.lightningBolts.push({
            segments,
            life: 8,
            color: s.c2,
            width: 2,
          });
          v.strikes.push({
            life: 9,
            maxLife: 9,
            x1: v.cx,
            y1: v.cy - 28,
            x2: tx,
            y2: ty,
          });
          hurtEntity(t, Math.max(1, Math.floor(s.dmg * 0.45)), v.cx, v.cy);
          spawnP(tx, ty, s.core, 2, 'sparkle');
        }
      }

      for (const p of state.projectiles) {
        const dx = p.x - v.cx;
        const dy = p.y - v.cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > s.summonR * 0.9) continue;
        const k = Math.max(0, 1 - dist / (s.summonR * 0.9));
        p.vx += (dx / dist) * 0.05 * k;
        p.vy += (dy / dist) * 0.05 * k;
      }

      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        const rr = 24 + Math.random() * 18;
        spawnP(v.cx + Math.cos(a) * rr, v.cy - 20 + Math.sin(a) * rr, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
      }

      state.dynamicLights.push({
        x: v.cx,
        y: v.cy - 16,
        r: 86 + Math.sin(v.phase * 0.8) * 10,
        color: s.core,
        int: 1.15,
        life: 2,
        ml: 2,
      });

      for (let i = v.ringPulse.length - 1; i >= 0; i--) {
        const rp = v.ringPulse[i];
        rp.r += rp.maxR / rp.maxLife;
        rp.life -= 1;
        if (rp.life <= 0) v.ringPulse.splice(i, 1);
      }

      for (let i = v.strikes.length - 1; i >= 0; i--) {
        v.strikes[i].life -= 1;
        if (v.strikes[i].life <= 0) v.strikes.splice(i, 1);
      }

      if (v.life <= 0) {
        v.state = 2;
        v.age = 0;
      }
      return;
    }

    if (!v.collapsed) {
      v.collapsed = true;
      explode(v.cx, v.cy, 76, 10, s.dmg * 1.8, s.color, s.c2);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.summonR * 0.9, life: 14, maxLife: 14, color: s.core });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 180, color: '#ffffff', int: 2.6, life: 7, ml: 7 });
      SoundFX.playSweep(200, 1500, 'triangle', 0.18, 0.1);
      state.shake(9);
    }

    if (v.age > 22) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_summon_obelisk(v, X) {
    const s = v.spell;
    const rise = v.state === 0 ? Math.min(1, v.rise || 0) : 1;

    X.save();
    X.translate(v.cx, v.cy);

    // Ground ritual pad.
    X.globalAlpha = 0.22;
    X.fillStyle = s.c2;
    X.beginPath();
    X.ellipse(0, 8, s.summonR * 0.72, s.summonR * 0.38, 0, 0, Math.PI * 2);
    X.fill();

    const bob = Math.sin((v.phase || 0) * 0.7) * 3;
    const raiseY = (1 - rise) * 42;

    // Split altar body: divine left face, infernal right face.
    X.globalAlpha = 0.92;
    X.fillStyle = '#171014';
    X.fillRect(-28, -16 + bob + raiseY, 56, 30);
    X.fillRect(-20, -42 + bob + raiseY, 40, 28);
    X.fillRect(-34, 12 + bob + raiseY, 68, 12);

    X.globalAlpha = 0.5;
    X.fillStyle = s.color;
    X.fillRect(-26, -14 + bob + raiseY, 24, 24);
    X.fillStyle = s.c2;
    X.fillRect(2, -14 + bob + raiseY, 24, 24);

    X.globalAlpha = 0.8;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.strokeRect(-28, -16 + bob + raiseY, 56, 30);
    X.strokeRect(-20, -42 + bob + raiseY, 40, 28);

    X.globalAlpha = 0.56;
    X.strokeStyle = s.core;
    X.lineWidth = 1;
    X.beginPath();
    X.moveTo(0, -42 + bob + raiseY);
    X.lineTo(0, 12 + bob + raiseY);
    X.stroke();

    drawEcholithHalo(X, -16, -50 + bob + raiseY, 20, 7, v.phase, s.color, 0.7);
    drawEcholithHorns(X, 17, -38 + bob + raiseY, 24, v.phase, s.c2, 0.74);
    drawEcholithScale(X, 0, -18 + bob + raiseY, 22, v.phase, s.color, s.c2, 0.75);

    // Orbiting verdict sigils.
    for (let i = 0; i < 6; i++) {
      const a = v.phase * 1.2 + (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 30;
      const y = Math.sin(a) * 16 - 34 + raiseY;
      X.globalAlpha = 0.75;
      X.fillStyle = i % 2 === 0 ? s.core : s.c2;
      X.beginPath();
      X.arc(x, y, 2.2, 0, Math.PI * 2);
      X.fill();
    }

    for (const rp of v.ringPulse || []) {
      const a = rp.life / rp.maxLife;
      X.globalAlpha = 0.24 * a;
      X.strokeStyle = s.color;
      X.lineWidth = 2;
      X.beginPath();
      X.ellipse(0, 10, rp.r, rp.r * 0.45, 0, 0, Math.PI * 2);
      X.stroke();
    }

    X.restore();

    X.save();
    for (const st of v.strikes || []) {
      const a = st.life / st.maxLife;
      X.globalAlpha = 0.45 * a;
      X.strokeStyle = s.core;
      X.lineWidth = 1.2;
      X.beginPath();
      X.moveTo(st.x1, st.y1);
      X.lineTo(st.x2, st.y2);
      X.stroke();
    }
    X.restore();
  },
};
