// echolith-manifest.js — Echolith school spell (Manifest)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity } from '../core/utils.js?v=7';
import { drawEcholithHalo, drawEcholithHorns, drawEcholithScale } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Altar of Scales',
  icon: '⚖',
  key: '7',
  category: 'Manifest',
  color: '#f4d36a',
  c2: '#7d0b16',
  core: '#fff8df',
  speed: 0,
  dmg: 8,
  mana: 26,
  cd: 980,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith',
  isEcholithManifest: true,
  echolithSide: 'threshold',
  maxLen: 300,
  dur: 760,
  thickness: 12,
  pulseEvery: 14,
  desc: 'Mark two altars and draw a black-gold road where mercy carries allies and damnation grinds enemies',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const x = ax + dx * t;
  const y = ay + dy * t;
  return { t, x, y, dist: Math.hypot(px - x, py - y) };
}

function createSegments(x1, y1, x2, y2, thickness, maxSeg = 20) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const count = Math.max(4, Math.min(maxSeg, Math.ceil(len / 20)));
  const segs = [];
  for (let i = 0; i < count; i++) {
    const t1 = i / count;
    const t2 = (i + 1) / count;
    const ax = x1 + (x2 - x1) * t1;
    const ay = y1 + (y2 - y1) * t1;
    const bx = x1 + (x2 - x1) * t2;
    const by = y1 + (y2 - y1) * t2;

    segs.push({
      x: Math.min(ax, bx) - thickness,
      y: Math.min(ay, by) - thickness * 0.8,
      w: Math.max(12, Math.abs(bx - ax) + thickness * 2),
      h: thickness * 1.6,
      centerX: (ax + bx) * 0.5,
      centerY: (ay + by) * 0.5,
      angle: Math.atan2(by - ay, bx - ax),
      thickness,
      isEcholithPlatform: true,
      active: true,
    });
  }
  return segs;
}

export const FIRE_HANDLERS = {
  isEcholithManifest(s, ox, oy, tx, ty, idx) {
    const draft = state.echolithManifestDraft;

    if (draft && draft.spellIdx === idx) {
      const dx = tx - draft.x;
      const dy = ty - draft.y;
      const len = Math.hypot(dx, dy) || 1;
      const maxLen = s.maxLen || 300;
      const nx = dx / len;
      const ny = dy / len;
      const x2 = draft.x + nx * Math.min(len, maxLen);
      const y2 = draft.y + ny * Math.min(len, maxLen);

      const segs = createSegments(draft.x, draft.y, x2, y2, s.thickness || 12);
      for (const seg of segs) state.platforms.push(seg);

      state.vfxSequences.push({
        type: 'echolith_manifest_lane',
        state: 0,
        age: 0,
        spell: s,
        x1: draft.x,
        y1: draft.y,
        x2,
        y2,
        segs,
        life: s.dur,
        phase: Math.random() * Math.PI * 2,
        waveheads: [],
      });

      if (draft.vfx) removeVfx(draft.vfx);
      state.echolithManifestDraft = null;

      SoundFX.playSweep(180, 840, 'triangle', 0.2, 0.14);
      spawnP(x2, y2, s.c2, 8, 'sparkle');
      return true;
    }

    const x = clamp(tx, 24, state.W - 24);
    const y = clamp(ty, 60, state.H - 24);

    const anchorVfx = { type: 'echolith_manifest_anchor', state: 0, age: 0, cx: x, cy: y, spell: s, phase: Math.random() * Math.PI * 2 };
    state.vfxSequences.push(anchorVfx);
    state.echolithManifestDraft = { spellIdx: idx, x, y, vfx: anchorVfx };

    // First click only defines anchor, so refund cast cost.
    state.refundSpellCast?.(idx, s.mana);

    SoundFX.playTone(430, 'sine', 0.1, 0.08);
    spawnP(x, y, s.color, 6, 'burst');
    return true;
  },
};

export const PROJ_HOOKS = {};

export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  echolith_manifest_anchor(v) {
    const d = state.echolithManifestDraft;
    if (!d || d.vfx !== v) {
      removeVfx(v);
      return;
    }

    v.phase += 0.16;
    v.cx = d.x;
    v.cy = d.y;

    if (v.age % 4 === 0) {
      spawnP(v.cx + (Math.random() - 0.5) * 7, v.cy + (Math.random() - 0.5) * 7, v.spell.c2, 1, 'sparkle');
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 28 + Math.sin(v.phase) * 4, color: v.spell.core, int: 0.9, life: 2, ml: 2 });
  },

  echolith_manifest_lane(v) {
    const s = v.spell;
    v.phase += 0.09;
    v.life -= 1;

    const ax = v.x1;
    const ay = v.y1;
    const bx = v.x2;
    const by = v.y2;
    const laneLen = Math.hypot(bx - ax, by - ay) || 1;

    const dirX = (bx - ax) / laneLen;
    const dirY = (by - ay) / laneLen;

    // Bodies standing on/near lane are carried by the judgment road; enemies are punished.
    const bodies = [state.player, ...state.entities.filter((e) => e.active)];
    for (const b of bodies) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const hit = distToSegment(cx, cy, ax, ay, bx, by);
      if (hit.dist > (s.thickness || 12) * 2.2) continue;

      const k = Math.max(0, 1 - hit.dist / ((s.thickness || 12) * 2.2));
      const boost = b === state.player ? 0.14 : 1.0 / (b.mass || 1);
      b.vx += dirX * boost * (1 + k * 2);
      b.vy += dirY * boost * (0.8 + k) - (b === state.player ? 0.06 : 0.24);

      if (b !== state.player && v.age % (s.pulseEvery || 14) === 0) {
        hurtEntity(b, Math.max(1, Math.floor(s.dmg * k)), hit.x, hit.y);
      }
    }

    for (const p of state.projectiles) {
      const hit = distToSegment(p.x, p.y, ax, ay, bx, by);
      if (hit.dist > (s.thickness || 12) * 3) continue;
      const k = Math.max(0, 1 - hit.dist / ((s.thickness || 12) * 3));
      p.vx += dirX * 0.26 * k;
      p.vy += dirY * 0.2 * k;
    }

    if (v.age % (s.pulseEvery || 14) === 0) {
      v.waveheads.push({ t: 0, speed: 0.04 + Math.random() * 0.02, life: 80 });
      SoundFX.playTone(520 + Math.random() * 120, 'sine', 0.05, 0.05);
    }

    for (let i = v.waveheads.length - 1; i >= 0; i--) {
      const w = v.waveheads[i];
      w.t += w.speed;
      w.life -= 1;

      const wx = ax + (bx - ax) * w.t;
      const wy = ay + (by - ay) * w.t;
      spawnP(wx, wy, Math.random() > 0.5 ? s.core : s.c2, 1, 'sparkle');
      state.dynamicLights.push({ x: wx, y: wy, r: 32, color: s.core, int: 0.8, life: 2, ml: 2 });

      for (const e of state.entities) {
        if (!e.active) continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const d = Math.hypot(ex - wx, ey - wy);
        if (d > (s.thickness || 12) * 2.4) continue;
        const k = Math.max(0, 1 - d / ((s.thickness || 12) * 2.4));
        e.vx += dirX * 1.3 * k / (e.mass || 1);
        e.vy += dirY * 0.9 * k / (e.mass || 1) - 0.12;
        if (v.age % 8 === 0) hurtEntity(e, Math.max(1, Math.floor(s.dmg * 0.5 * k)), wx, wy);
      }

      if (w.t >= 1 || w.life <= 0) v.waveheads.splice(i, 1);
    }

    if (v.age % 2 === 0) {
      const t = Math.random();
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      spawnP(x, y, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
    }

    state.dynamicLights.push({ x: (ax + bx) * 0.5, y: (ay + by) * 0.5, r: 70, color: s.core, int: 0.8, life: 2, ml: 2 });

    if (v.life <= 0) {
      for (const seg of v.segs || []) {
        const idx = state.platforms.indexOf(seg);
        if (idx !== -1) state.platforms.splice(idx, 1);
      }
      spawnP((ax + bx) * 0.5, (ay + by) * 0.5, s.c2, 14, 'burst');
      state.shockwaves.push({ x: (ax + bx) * 0.5, y: (ay + by) * 0.5, r: 0, maxR: laneLen * 0.4, life: 12, maxLife: 12, color: s.core });
      removeVfx(v);
    }
  },
};

export const VFX_DRAW = {
  echolith_manifest_anchor(v, X) {
    const s = v.spell;
    X.save();

    X.globalAlpha = 0.7;
    X.strokeStyle = s.c2;
    X.lineWidth = 1.5;
    X.beginPath();
    X.arc(v.cx, v.cy, 10 + Math.sin(v.age * 0.25) * 2, 0, Math.PI * 2);
    X.stroke();

    X.globalAlpha = 0.35;
    X.strokeStyle = s.core;
    X.lineWidth = 1.2;
    X.setLineDash([5, 5]);
    X.lineDashOffset = -(v.phase || 0) * 8;
    X.beginPath();
    X.arc(v.cx, v.cy, 16 + Math.sin(v.age * 0.2) * 3, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);

    drawEcholithScale(X, v.cx, v.cy, 16, v.phase, s.color, s.c2, 0.65);

    const d = state.echolithManifestDraft;
    if (d && d.vfx === v && state.mouse) {
      X.globalAlpha = 0.22;
      X.strokeStyle = s.core;
      X.lineWidth = 1;
      X.beginPath();
      X.moveTo(v.cx, v.cy);
      X.lineTo(state.mouse.x, state.mouse.y);
      X.stroke();
    }

    X.restore();
  },

  echolith_manifest_lane(v, X) {
    const s = v.spell;
    const dx = v.x2 - v.x1;
    const dy = v.y2 - v.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const px = -ny;
    const py = nx;

    X.save();

    X.globalAlpha = 0.22;
    X.strokeStyle = s.color;
    X.lineWidth = (s.thickness || 12) * 2.2;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    X.globalAlpha = 0.82;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(v.x1, v.y1);
    X.lineTo(v.x2, v.y2);
    X.stroke();

    // Moving verdict marks travelling along the lane.
    for (let i = 0; i < 8; i++) {
      const t = ((v.phase * 0.08 + i * 0.14) % 1 + 1) % 1;
      const cx = v.x1 + dx * t;
      const cy = v.y1 + dy * t;
      const size = 5 + Math.sin(v.phase + i) * 1.2;

      X.globalAlpha = 0.56;
      X.strokeStyle = i % 2 === 0 ? s.core : s.c2;
      X.lineWidth = 1.1;
      X.beginPath();
      X.moveTo(cx - nx * size + px * size, cy - ny * size + py * size);
      X.lineTo(cx + nx * size, cy + ny * size);
      X.lineTo(cx - nx * size - px * size, cy - ny * size - py * size);
      X.stroke();
    }

    for (const w of v.waveheads || []) {
      const wx = v.x1 + dx * w.t;
      const wy = v.y1 + dy * w.t;
      X.globalAlpha = 0.8;
      X.fillStyle = s.core;
      X.beginPath();
      X.arc(wx, wy, 3, 0, Math.PI * 2);
      X.fill();
    }

    X.globalAlpha = 0.46;
    X.strokeStyle = s.core;
    X.lineWidth = 1.2;
    X.beginPath();
    X.arc(v.x1, v.y1, 8 + Math.sin(v.phase * 0.9) * 1.5, 0, Math.PI * 2);
    X.stroke();
    X.beginPath();
    X.arc(v.x2, v.y2, 8 + Math.cos(v.phase * 0.9) * 1.5, 0, Math.PI * 2);
    X.stroke();

    drawEcholithHalo(X, v.x1, v.y1 - 4, 18, 7, v.phase, s.color, 0.46);
    drawEcholithHorns(X, v.x2, v.y2 + 8, 22, v.phase, s.c2, 0.48);
    drawEcholithScale(X, (v.x1 + v.x2) * 0.5, (v.y1 + v.y2) * 0.5, 18, v.phase, s.color, s.c2, 0.45);

    X.restore();
  },
};
