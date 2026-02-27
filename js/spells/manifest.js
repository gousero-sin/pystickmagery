import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity } from '../core/utils.js?v=7';

const DEFAULT_KEY = '/';

function removeVfxSequence(vfx) {
  const idx = state.vfxSequences.indexOf(vfx);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function quadPoint(a, b, c, t) {
  const it = 1 - t;
  return {
    x: it * it * a.x + 2 * it * t * b.x + t * t * c.x,
    y: it * it * a.y + 2 * it * t * b.y + t * t * c.y,
  };
}

function buildLightningBolt(x1, y1, x2, y2, color, width = 2) {
  const segs = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    segs.push({
      x: x1 + (x2 - x1) * t + (i > 0 && i < steps ? (Math.random() - 0.5) * 14 : 0),
      y: y1 + (y2 - y1) * t + (i > 0 && i < steps ? (Math.random() - 0.5) * 14 : 0),
    });
  }
  state.lightningBolts.push({ segments: segs, life: 12, color, width });
}

function getLiveSegments(v) {
  return v.segments.filter((seg) => seg.placed && !seg.destroyed);
}

function segmentOverlapBody(seg, body, padX = 8, padY = 18) {
  return body.x + body.w > seg.x - padX &&
    body.x < seg.x + seg.w + padX &&
    body.y + body.h > seg.y - padY &&
    body.y < seg.y + seg.h + padY;
}

function pointNearSegment(seg, x, y, pad = 70) {
  return x > seg.x - pad && x < seg.x + seg.w + pad && y > seg.y - pad && y < seg.y + seg.h + pad;
}

function pickSegment(segments, seed) {
  return segments[Math.abs(seed) % Math.max(1, segments.length)] || null;
}

function nearestSegmentCenter(segments, x, y, maxDist = 1e9) {
  let closest = null;
  let best = maxDist;
  for (const seg of segments) {
    const dx = seg.centerX - x;
    const dy = seg.centerY - y;
    const dist = Math.hypot(dx, dy);
    if (dist < best) {
      best = dist;
      closest = seg;
    }
  }
  return closest ? { segment: closest, dist: best } : null;
}

function getManifestPalette(spell) {
  const style = spell.manifestStyle || 'nature';
  const map = {
    nature: { edge: spell.c2, glow: spell.core, shadow: '#2f1a08', spark: '#77bb66' },
    wind: { edge: '#f2fffb', glow: spell.core, shadow: '#6ea7b6', spark: '#d9ffff' },
    fire: { edge: '#ffb24a', glow: '#fff0a8', shadow: '#301107', spark: '#ff6828' },
    water: { edge: '#9ae9ff', glow: '#efffff', shadow: '#1b4f73', spark: '#d9fbff' },
    lightning: { edge: '#fff37a', glow: '#ffffff', shadow: '#3e3b18', spark: '#fff8c0' },
    arcane: { edge: '#f2a3ff', glow: '#fff0ff', shadow: '#2d1238', spark: '#d86cff' },
    void: { edge: '#8b57ff', glow: '#d4b4ff', shadow: '#090311', spark: '#5922c9' },
    holy: { edge: '#fff0a8', glow: '#ffffff', shadow: '#6a5d28', spark: '#fff7cf' },
    chrono: { edge: '#8ad9ff', glow: '#fff6b8', shadow: '#3c2f14', spark: '#5cd2ff' },
    celestial: { edge: '#ffd680', glow: '#ffffff', shadow: '#1b2148', spark: '#ffeeb8' },
    cinema: { edge: '#ffd3a0', glow: '#fff7d1', shadow: '#23180f', spark: '#ffb06b' },
  };
  return map[style] || map.nature;
}

function getManifestLifeRatio(v) {
  if (!v.maxLife || v.maxLife <= 0) return 1;
  return Math.max(0, Math.min(1, v.life / v.maxLife));
}

function removeManifestPlatformSegment(seg) {
  const idx = state.platforms.indexOf(seg);
  if (idx !== -1) state.platforms.splice(idx, 1);
}

function destroyManifestConstruct(v) {
  for (const seg of v.segments) {
    if (seg.placed) removeManifestPlatformSegment(seg);
    seg.destroyed = true;
  }
  const manifestIdx = state.manifestConstructs.indexOf(v);
  if (manifestIdx !== -1) state.manifestConstructs.splice(manifestIdx, 1);
  removeVfxSequence(v);
}

function manifestBuildNoise(spell) {
  const style = spell.manifestStyle || 'nature';
  if (style === 'fire') SoundFX.playNoise(0.35, 0.25, 220, 'lowpass');
  else if (style === 'wind') SoundFX.playNoise(0.18, 0.14, 900, 'bandpass', 4);
  else if (style === 'water') SoundFX.playSweep(500, 900, 'triangle', 0.12, 0.12);
  else if (style === 'lightning') SoundFX.playTone(1200, 'sawtooth', 0.08, 0.09);
  else if (style === 'arcane') SoundFX.playSweep(380, 760, 'square', 0.1, 0.1);
  else if (style === 'void') SoundFX.playSweep(120, 40, 'sine', 0.25, 0.16);
  else if (style === 'holy') SoundFX.playTone(720, 'sine', 0.08, 0.12);
  else if (style === 'chrono') SoundFX.playTone(480, 'triangle', 0.08, 0.1);
  else if (style === 'celestial') SoundFX.playSweep(220, 880, 'sine', 0.12, 0.12);
  else if (style === 'cinema') SoundFX.playNoise(0.2, 0.14, 360, 'lowpass');
  else SoundFX.playNoise(0.2, 0.18, 220, 'lowpass');
}

function manifestAnchorBurst(spell, x, y) {
  const palette = getManifestPalette(spell);
  spawnP(x, y, palette.edge, 8, 'burst');
  spawnP(x, y, palette.glow, 5, 'sparkle');
  state.dynamicLights.push({ x, y, r: 44, color: palette.glow, int: 1, life: 10, ml: 10 });
}

function createManifestConstruct(spell, p1, rawP2) {
  const rawDx = rawP2.x - p1.x;
  const rawDy = rawP2.y - p1.y;
  const rawLen = Math.hypot(rawDx, rawDy) || 1;
  const maxLen = spell.manifestMax || 320;
  const clampedLen = Math.min(maxLen, rawLen);
  const p2 = rawLen > clampedLen ? {
    x: p1.x + rawDx / rawLen * clampedLen,
    y: p1.y + rawDy / rawLen * clampedLen,
  } : { x: rawP2.x, y: rawP2.y };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const arch = spell.manifestArc ?? Math.max(10, Math.min(36, len * 0.11));
  const control = {
    x: (p1.x + p2.x) * 0.5 - (dy / len) * arch * 0.3,
    y: (p1.y + p2.y) * 0.5 - arch - Math.abs(dy) * 0.05,
  };
  const segmentCount = Math.max(4, Math.min(22, Math.ceil(len / 18)));
  const points = [];
  for (let i = 0; i <= segmentCount; i++) points.push(quadPoint(p1, control, p2, i / segmentCount));

  const thickness = spell.manifestThickness || 10;
  const segments = [];
  for (let i = 0; i < segmentCount; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const segment = {
      x: Math.min(a.x, b.x) - thickness * 0.7,
      y: Math.min(a.y, b.y) - thickness * 0.7,
      w: Math.max(12, Math.abs(b.x - a.x) + thickness * 1.4),
      h: thickness * 1.5,
      centerX: (a.x + b.x) * 0.5,
      centerY: (a.y + b.y) * 0.5,
      beamLen: segLen + thickness * 0.9,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      thickness,
      hp: spell.manifestSegmentHp || 32,
      maxHp: spell.manifestSegmentHp || 32,
      hitFlash: 0,
      swaySeed: Math.random() * Math.PI * 2,
      buildIndex: i,
      a,
      b,
      placed: false,
      destroyed: false,
      solid: spell.manifestSolid !== false,
      profile: spell.manifestProfile || 'beam',
      isManifestSegment: true,
      manifestStyle: spell.manifestStyle,
      construct: null,
    };
    segments.push(segment);
  }

  const construct = {
    type: 'manifest_construct',
    state: 0,
    age: 0,
    spell,
    p1,
    p2,
    control,
    points,
    segments,
    buildProgress: 0,
    damageFlash: 0,
    destroyed: false,
    destroyOrigin: null,
    solid: spell.manifestSolid !== false,
    profile: spell.manifestProfile || 'beam',
    life: spell.manifestDuration || 0,
    maxLife: spell.manifestDuration || 0,
    swaySeed: Math.random() * Math.PI * 2,
    isManifestEffect: true,
    id: `manifest-${Math.round(performance.now() * 1000)}-${Math.floor(Math.random() * 999)}`,
  };
  segments.forEach((segment) => { segment.construct = construct; });
  return construct;
}

function applyManifestEffect(v) {
  const s = v.spell;
  const liveSegments = getLiveSegments(v);
  if (!liveSegments.length) return;
  const player = state.player;

  if (s.manifestEffect === 'nature_root') {
    if (v.age % 16 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        if (!liveSegments.some((seg) => segmentOverlapBody(seg, e, 6, 20))) continue;
        hurtEntity(e, s.manifestPulseDmg || 3, e.x + e.w / 2, e.y + e.h / 2);
        e.vx *= 0.7;
        e.vy *= 0.85;
      }
    }
  } else if (s.manifestEffect === 'wind_lift') {
    const len = Math.hypot(v.p2.x - v.p1.x, v.p2.y - v.p1.y) || 1;
    const flowX = (v.p2.x - v.p1.x) / len;
    const flowY = (v.p2.y - v.p1.y) / len;
    const bodies = [player, ...state.entities.filter((e) => e.active)];
    for (const body of bodies) {
      if (!liveSegments.some((seg) => segmentOverlapBody(seg, body, 10, 26))) continue;
      body.vx += flowX * 0.08;
      body.vy += flowY * 0.06 - 0.22;
      body.vx *= 0.998;
    }
  } else if (s.manifestEffect === 'fire_burn') {
    if (v.age % 12 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        const seg = liveSegments.find((segment) => segmentOverlapBody(segment, e, 8, 18));
        if (!seg) continue;
        hurtEntity(e, s.manifestPulseDmg || 4, seg.centerX, seg.centerY);
        e.vy -= 1 / (e.mass || 1);
      }
    }
  } else if (s.manifestEffect === 'water_chill') {
    if (player && liveSegments.some((seg) => segmentOverlapBody(seg, player, 10, 20)) && v.age % 16 === 0) {
      player.mana = Math.min(player.maxMana, player.mana + 0.7);
    }
    if (v.age % 16 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        if (!liveSegments.some((seg) => segmentOverlapBody(seg, e, 8, 18))) continue;
        state.frozenEntities?.set(e, Math.max(state.frozenEntities.get(e) || 0, 18));
        hurtEntity(e, 1, e.x + e.w / 2, e.y + e.h / 2);
      }
    }
  } else if (s.manifestEffect === 'lightning_arc') {
    if (v.age % 24 === 0) {
      let target = null;
      let origin = null;
      let best = 90;
      for (const seg of liveSegments) {
        for (const e of state.entities) {
          if (!e.active) continue;
          const dx = e.x + e.w / 2 - seg.centerX;
          const dy = e.y + e.h / 2 - seg.centerY;
          const dist = Math.hypot(dx, dy);
          if (dist < best) {
            best = dist;
            target = e;
            origin = seg;
          }
        }
      }
      if (target && origin) {
        hurtEntity(target, s.manifestPulseDmg || 6, origin.centerX, origin.centerY);
        buildLightningBolt(origin.centerX, origin.centerY, target.x + target.w / 2, target.y + target.h / 2, s.core, 2);
        state.dynamicLights.push({ x: target.x + target.w / 2, y: target.y + target.h / 2, r: 54, color: s.core, int: 1.4, life: 8, ml: 8 });
      }
    }
  } else if (s.manifestEffect === 'arcane_focus') {
    if (player && liveSegments.some((seg) => segmentOverlapBody(seg, player, 12, 20)) && v.age % 10 === 0) {
      player.mana = Math.min(player.maxMana, player.mana + 0.8);
    }
  } else if (s.manifestEffect === 'void_pull') {
    if (v.age % 3 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        const nearest = nearestSegmentCenter(liveSegments, e.x + e.w / 2, e.y + e.h / 2, 95);
        if (!nearest) continue;
        const dx = nearest.segment.centerX - (e.x + e.w / 2);
        const dy = nearest.segment.centerY - (e.y + e.h / 2);
        e.vx += dx * 0.012 / (e.mass || 1);
        e.vy += dy * 0.01 / (e.mass || 1) - 0.02;
      }
      for (const p of state.projectiles) {
        const nearest = nearestSegmentCenter(liveSegments, p.x, p.y, 95);
        if (!nearest) continue;
        const dx = nearest.segment.centerX - p.x;
        const dy = nearest.segment.centerY - p.y;
        p.vx += dx * 0.015;
        p.vy += dy * 0.015;
      }
    }
  } else if (s.manifestEffect === 'holy_grace') {
    if (player && liveSegments.some((seg) => segmentOverlapBody(seg, player, 10, 18)) && v.age % 18 === 0) {
      player.hp = Math.min(player.maxHp, player.hp + (s.manifestHeal || 1));
      spawnP(player.x + player.w / 2, player.y + player.h / 2, s.core, 3, 'sparkle');
    }
    if (v.age % 20 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        const seg = liveSegments.find((segment) => segmentOverlapBody(segment, e, 6, 18));
        if (!seg) continue;
        const dir = Math.sign(e.x + e.w / 2 - seg.centerX) || 1;
        e.vx += dir * 1.2 / (e.mass || 1);
      }
    }
  } else if (s.manifestEffect === 'chrono_slow') {
    if (v.age % 2 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        if (!liveSegments.some((seg) => segmentOverlapBody(seg, e, 12, 22))) continue;
        e.vx *= 0.9;
        e.vy *= 0.9;
      }
      for (const p of state.projectiles) {
        if (!liveSegments.some((seg) => pointNearSegment(seg, p.x, p.y, 36))) continue;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
    }
  } else if (s.manifestEffect === 'celestial_drift') {
    const bodies = [player, ...state.entities.filter((e) => e.active)];
    for (const body of bodies) {
      if (!liveSegments.some((seg) => segmentOverlapBody(seg, body, 10, 24))) continue;
      body.vy -= 0.12;
    }
    if (player && liveSegments.some((seg) => segmentOverlapBody(seg, player, 10, 18)) && v.age % 18 === 0) {
      player.mana = Math.min(player.maxMana, player.mana + 0.45);
    }
  } else if (s.manifestEffect === 'cinema_stage') {
    if (v.age % 24 === 0) {
      for (const e of state.entities) {
        if (!e.active) continue;
        const seg = liveSegments.find((segment) => segmentOverlapBody(segment, e, 14, 26));
        if (!seg) continue;
        hurtEntity(e, s.manifestPulseDmg || 3, seg.centerX, seg.centerY);
        e.vx *= 0.65;
        e.vy *= 0.8;
      }
    }
  }

  if (v.age % 18 === 0) {
    const seg = pickSegment(liveSegments, v.age);
    if (seg) {
      const palette = getManifestPalette(s);
      spawnP(seg.centerX + (Math.random() - 0.5) * 8, seg.centerY + (Math.random() - 0.5) * 8, palette.spark, 1, 'sparkle');
    }
  }
}

export function createManifestSpell(config) {
  return {
    key: DEFAULT_KEY,
    category: 'Manifest',
    speed: 0,
    dmg: 0,
    grav: 0,
    drag: 1,
    bounce: 0,
    trail: 'manifest',
    isManifestConstruct: true,
    mana: 24,
    cd: 900,
    r: 0,
    manifestMax: 320,
    manifestThickness: 10,
    manifestSegmentHp: 32,
    manifestArc: 18,
    manifestPulseDmg: 3,
    manifestDuration: 0,
    manifestSolid: true,
    manifestProfile: 'beam',
    manifestGlyph: '#',
    ...config,
  };
}

export const MANIFEST_FIRE_HANDLERS = {
  isManifestConstruct(s, ox, oy, tx, ty, idx) {
    const draft = state.manifestDraft;
    if (draft && draft.spellIdx === idx) {
      const dist = Math.hypot(tx - draft.x, ty - draft.y);
      if (dist < 24) {
        draft.x = tx;
        draft.y = ty;
        if (draft.vfx) { draft.vfx.cx = tx; draft.vfx.cy = ty; }
        state.refundSpellCast?.(idx, s.mana);
        return true;
      }

      const construct = createManifestConstruct(s, { x: draft.x, y: draft.y }, { x: tx, y: ty });
      removeVfxSequence(draft.vfx);
      state.manifestDraft = null;
      state.manifestConstructs.push(construct);
      state.vfxSequences.push(construct);
      manifestBuildNoise(s);
      manifestAnchorBurst(s, construct.p1.x, construct.p1.y);
      manifestAnchorBurst(s, construct.p2.x, construct.p2.y);
      state.shake(5);
      return true;
    }

    if (draft?.vfx) removeVfxSequence(draft.vfx);
    const anchor = { type: 'manifest_anchor', state: 0, age: 0, cx: tx, cy: ty, spell: s, isManifestEffect: true };
    state.manifestDraft = { type: 'manifest_construct', spellIdx: idx, x: tx, y: ty, vfx: anchor };
    state.vfxSequences.push(anchor);
    state.refundSpellCast?.(idx, s.mana);
    manifestBuildNoise(s);
    manifestAnchorBurst(s, tx, ty);
    return true;
  },
};

export const MANIFEST_VFX_UPDATE = {
  manifest_anchor(v) {
    const draft = state.manifestDraft;
    if (!draft || draft.vfx !== v) { removeVfxSequence(v); return; }
    v.cx = draft.x;
    v.cy = draft.y;
    const palette = getManifestPalette(v.spell);
    if (v.age % 6 === 0) {
      spawnP(v.cx + (Math.random() - 0.5) * 8, v.cy + (Math.random() - 0.5) * 8, palette.edge, 1, 'dust');
      spawnP(v.cx, v.cy, palette.glow, 1, 'sparkle');
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 28 + Math.sin(v.age * 0.15) * 8, color: palette.glow, int: 0.9, life: 3, ml: 3 });
  },

  manifest_construct(v) {
    const s = v.spell;
    v.damageFlash = Math.max(0, (v.damageFlash || 0) - 0.05);
    const timeScale = Math.max(0.75, Math.min(2.5, (v.dt || (1000 / 60)) / (1000 / 60)));

    if (v.destroyed) {
      if (!v.collapseBurst) {
        const burstX = v.destroyOrigin?.x ?? v.p2.x;
        const burstY = v.destroyOrigin?.y ?? v.p2.y;
        const palette = getManifestPalette(s);
        spawnP(burstX, burstY, palette.edge, 20, 'explode');
        spawnP((v.p1.x + v.p2.x) * 0.5, (v.p1.y + v.p2.y) * 0.5, palette.glow, 10, 'sparkle');
        manifestBuildNoise(s);
        state.shake(6);
        v.collapseBurst = true;
      }
      destroyManifestConstruct(v);
      return;
    }

    const liveSegments = getLiveSegments(v);
    if (v.state !== 0 && liveSegments.length === 0) {
      v.destroyed = true;
      v.destroyOrigin = { x: v.p2.x, y: v.p2.y, color: s.c2 };
      return;
    }

    if (v.state === 0) {
      v.buildProgress = Math.min(1, v.buildProgress + (s.manifestBuildRate || 0.04) * timeScale);
      const targetSegments = Math.max(1, Math.ceil(v.buildProgress * v.segments.length));
      v.head = quadPoint(v.p1, v.control, v.p2, v.buildProgress);

      for (let i = 0; i < targetSegments; i++) {
        const seg = v.segments[i];
        if (seg.placed || seg.destroyed) continue;
        seg.placed = true;
        if (seg.solid) state.platforms.push(seg);
        const palette = getManifestPalette(s);
        spawnP(seg.centerX, seg.centerY, i % 2 === 0 ? palette.edge : palette.spark, 4, 'dust');
        spawnP(seg.centerX, seg.centerY, palette.glow, 2, 'sparkle');
      }

      if (v.age % 3 === 0) {
        const palette = getManifestPalette(s);
        spawnP(v.head.x + (Math.random() - 0.5) * 10, v.head.y + (Math.random() - 0.5) * 10, palette.edge, 2, 'dust');
        spawnP(v.head.x, v.head.y, palette.glow, 1, 'sparkle');
      }
      state.dynamicLights.push({ x: v.head.x, y: v.head.y, r: 40, color: s.core, int: 1.3, life: 4, ml: 4 });
      if (v.buildProgress >= 1) {
        v.state = 1;
        v.age = 0;
        SoundFX.playSweep(280, 120, 'triangle', 0.2, 0.12);
        state.shockwaves.push({ x: v.p2.x, y: v.p2.y, r: 0, maxR: 26, life: 8, maxLife: 8, color: s.c2 });
      }
      return;
    }

    if (v.maxLife > 0) {
      v.life = Math.max(0, v.life - timeScale);
      if (v.life <= 0) {
        v.destroyed = true;
        v.destroyOrigin = { x: (v.p1.x + v.p2.x) * 0.5, y: (v.p1.y + v.p2.y) * 0.5, color: s.c2 };
        return;
      }
    }

    applyManifestEffect(v);
  },
};

function drawCurrentManifest(v, X, palette, lifeAlpha, T) {
  const width = (v.spell.manifestThickness || 24) * 1.4;
  for (let layer = 0; layer < 3; layer++) {
    X.strokeStyle = layer === 0 ? palette.glow : layer === 1 ? '#ffffff' : palette.edge;
    X.lineWidth = width - layer * 6;
    X.globalAlpha = (0.12 - layer * 0.025) * lifeAlpha;
    X.beginPath();
    for (let i = 0; i < v.points.length; i++) {
      const pt = v.points[i];
      const phase = T * (2.4 + layer * 0.4) + i * 0.5 + layer * 1.3;
      const ox = Math.sin(phase) * (6 - layer * 1.4);
      const oy = Math.cos(phase * 1.2) * (3 - layer * 0.7);
      if (i === 0) X.moveTo(pt.x + ox, pt.y + oy);
      else X.lineTo(pt.x + ox, pt.y + oy);
    }
    X.stroke();
  }
}

function drawConduitManifest(v, X, palette, lifeAlpha, T) {
  const liveSegments = getLiveSegments(v);
  X.strokeStyle = palette.edge;
  X.lineWidth = 2;
  X.globalAlpha = 0.5 * lifeAlpha;
  for (const seg of liveSegments) {
    X.beginPath();
    X.moveTo(seg.a.x, seg.a.y);
    X.lineTo((seg.a.x + seg.b.x) * 0.5 + Math.sin(T * 12 + seg.swaySeed) * 6, (seg.a.y + seg.b.y) * 0.5 + Math.cos(T * 10 + seg.swaySeed) * 6);
    X.lineTo(seg.b.x, seg.b.y);
    X.stroke();
    X.fillStyle = '#ffffff';
    X.globalAlpha = 0.7 * lifeAlpha;
    X.beginPath(); X.arc(seg.centerX, seg.centerY, 3, 0, Math.PI * 2); X.fill();
    X.strokeStyle = palette.edge;
    X.globalAlpha = 0.5 * lifeAlpha;
  }
}

function drawTrackManifest(v, X, palette, lifeAlpha, T) {
  const liveSegments = getLiveSegments(v);
  X.strokeStyle = palette.edge;
  X.lineWidth = 1.6;
  X.globalAlpha = 0.45 * lifeAlpha;
  for (const seg of liveSegments) {
    X.beginPath();
    X.moveTo(seg.a.x, seg.a.y);
    X.lineTo(seg.b.x, seg.b.y);
    X.stroke();
    X.strokeStyle = palette.glow;
    X.globalAlpha = 0.28 * lifeAlpha;
    X.beginPath();
    X.arc(seg.centerX, seg.centerY, 6 + Math.sin(T * 4 + seg.swaySeed) * 1.5, 0, Math.PI * 2);
    X.stroke();
    X.strokeStyle = palette.edge;
    X.globalAlpha = 0.45 * lifeAlpha;
  }
}

export const MANIFEST_VFX_DRAW = {
  manifest_anchor(v, X) {
    const s = v.spell;
    const palette = getManifestPalette(s);
    const pulse = 0.8 + Math.sin(performance.now() * 0.01 + (s.manifestArc || 0)) * 0.2;
    X.save();
    X.translate(v.cx, v.cy);
    X.globalAlpha = 0.18 * pulse;
    X.fillStyle = palette.glow;
    X.beginPath(); X.arc(0, 0, 20, 0, Math.PI * 2); X.fill();
    X.strokeStyle = palette.edge; X.lineWidth = 1.5; X.globalAlpha = 0.65;
    X.setLineDash([4, 5]);
    X.beginPath(); X.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); X.stroke();
    X.setLineDash([]);
    X.globalAlpha = 0.9;
    X.fillStyle = palette.glow;
    X.font = '10px serif';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText(s.manifestGlyph || '#', 0, 0);
    X.restore();
    X.globalAlpha = 1;
  },

  manifest_construct(v, X) {
    const s = v.spell;
    const palette = getManifestPalette(s);
    const liveSegments = getLiveSegments(v);
    const T = performance.now() * 0.0025;
    const lifeAlpha = getManifestLifeRatio(v);
    const profile = s.manifestProfile || 'beam';
    X.save();

    X.strokeStyle = palette.edge;
    X.lineWidth = 2;
    X.globalAlpha = (v.state === 0 ? 0.3 : 0.14) * Math.max(0.35, lifeAlpha);
    X.setLineDash([7, 5]);
    X.beginPath();
    const previewPts = v.state === 0 ? Math.max(2, Math.ceil(v.points.length * Math.max(v.buildProgress, 0.15))) : v.points.length;
    for (let i = 0; i < previewPts; i++) {
      const pt = v.points[Math.min(i, v.points.length - 1)];
      if (i === 0) X.moveTo(pt.x, pt.y);
      else X.lineTo(pt.x, pt.y);
    }
    if (v.state === 0 && v.head) X.lineTo(v.head.x, v.head.y);
    X.stroke();
    X.setLineDash([]);

    if (profile === 'current') drawCurrentManifest(v, X, palette, lifeAlpha, T);
    else if (profile === 'conduit') drawConduitManifest(v, X, palette, lifeAlpha, T);
    else if (profile === 'track') drawTrackManifest(v, X, palette, lifeAlpha, T);

    if (s.manifestSolid !== false) {
      for (const seg of liveSegments) {
        const nx = Math.sin(seg.angle);
        const ny = -Math.cos(seg.angle);
        const sway = Math.sin(T * 1.7 + seg.swaySeed) * 2.6;
        X.strokeStyle = palette.edge;
        X.lineWidth = 1.8;
        X.globalAlpha = (0.45 + (v.damageFlash || 0) * 0.2) * Math.max(0.35, lifeAlpha);
        X.beginPath();
        X.moveTo(seg.a.x, seg.a.y);
        X.quadraticCurveTo((seg.a.x + seg.b.x) * 0.5 + nx * sway, (seg.a.y + seg.b.y) * 0.5 + ny * sway, seg.b.x, seg.b.y);
        X.stroke();

        X.strokeStyle = palette.spark;
        X.lineWidth = 1.1;
        X.globalAlpha = 0.35 * Math.max(0.35, lifeAlpha);
        X.beginPath();
        X.moveTo(seg.a.x + nx * 3, seg.a.y + ny * 3);
        X.quadraticCurveTo((seg.a.x + seg.b.x) * 0.5 - nx * sway * 0.4, (seg.a.y + seg.b.y) * 0.5 - ny * sway * 0.4, seg.b.x + nx * 3, seg.b.y + ny * 3);
        X.stroke();
      }
    }

    const anchors = [v.p1, v.p2];
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const pulse = 0.45 + Math.sin(T * 4 + i * 1.8) * 0.18 + (v.damageFlash || 0) * 0.3;
      X.globalAlpha = pulse * Math.max(0.35, lifeAlpha);
      X.strokeStyle = i === 0 ? palette.edge : palette.glow;
      X.lineWidth = 1.4;
      X.beginPath(); X.arc(anchor.x, anchor.y, 8 + i, 0, Math.PI * 2); X.stroke();
    }

    if (v.state === 0 && v.head) {
      X.globalAlpha = 0.42 * Math.max(0.35, lifeAlpha);
      X.fillStyle = palette.glow;
      X.beginPath(); X.arc(v.head.x, v.head.y, 9, 0, Math.PI * 2); X.fill();
      X.globalAlpha = 0.95 * Math.max(0.35, lifeAlpha);
      X.fillStyle = '#ffffff';
      X.beginPath(); X.arc(v.head.x, v.head.y, 3, 0, Math.PI * 2); X.fill();
    }

    X.restore();
    X.globalAlpha = 1;
  },
};
