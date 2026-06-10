// Lust spell school: cinematic temptation, redlight glamor, and censor-bar magic.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';

const STATUS_SPELL = {
  name: 'Lust Status',
  color: '#ff5caa',
  c2: '#ffc2d8',
  core: '#fff7fb',
};

const STYLE_COLORS = {
  velvet: ['#9b0f36', '#ff2d77', '#ffd7e4'],
  perfume: ['#5c128f', '#df43ff', '#fff0ff'],
  blush: ['#d41344', '#ff9d6b', '#fff0db'],
  silk: ['#9e6f89', '#ffe6f2', '#ffffff'],
  afterglow: ['#ff3a2e', '#ff9d38', '#fff1a3'],
  rhythm: ['#161016', '#ff2f75', '#fff0f7'],
  mirror: ['#71bdff', '#ff6ee8', '#ffffff'],
  mosaic: ['#ff2a78', '#25d4ff', '#fff4fb'],
  ward: ['#7d102d', '#ffb84d', '#fff4d0'],
  euphoria: ['#ff105f', '#ffb000', '#ffffff'],
};

function palette(style) {
  const [color, c2, core] = STYLE_COLORS[style] || STYLE_COLORS.velvet;
  return { color, c2, core };
}

function playerCenter() {
  const p = state.player;
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

function bodyCenter(body) {
  return { x: body.x + body.w / 2, y: body.y + body.h / 2 };
}

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function activeEntities() {
  return state.entities.filter(isEnemyEntity);
}

function nearestEntity(x, y, radius = 120) {
  let best = null;
  let bestDist = radius;
  for (const entity of activeEntities()) {
    const c = bodyCenter(entity);
    const dist = Math.hypot(c.x - x, c.y - y);
    if (dist < bestDist) {
      best = entity;
      bestDist = dist;
    }
  }
  return best;
}

function ensureStatusTicker() {
  if (!state.vfxSequences.some((v) => v.type === 'lust_status')) {
    state.vfxSequences.push({ type: 'lust_status', state: 0, age: 0, spell: STATUS_SPELL });
  }
}

function applyCharm(entity, frames = 90) {
  if (!entity || !entity.active) return;
  entity.lustCharm = Math.max(entity.lustCharm || 0, frames);
  entity.vx *= 0.72;
  entity.vy *= 0.88;
  ensureStatusTicker();
}

function applyJoy(mana = 0, hp = 0, label = 0) {
  const p = state.player;
  if (!p) return;
  if (mana > 0) p.mana = Math.min(p.maxMana, p.mana + mana);
  if (hp > 0) p.hp = Math.min(p.maxHp, p.hp + hp);
  p.lustJoy = Math.max(p.lustJoy || 0, 90);
  if (label > 0) {
    state.damageNumbers.push({
      x: p.x + p.w / 2,
      y: p.y - 12,
      val: Math.round(label),
      life: 55,
      vy: -1.4,
      color: '#44ff44',
      sc: 1.1,
    });
  }
  ensureStatusTicker();
}

function addLight(x, y, r, color, int = 1, life = 8) {
  state.dynamicLights.push({ x, y, r, color, int, life, ml: life });
}

function addWave(x, y, maxR, color, life = 18) {
  state.shockwaves.push({ x, y, r: 0, maxR, life, maxLife: life, color });
}

function castPoint(ox, oy, tx, ty, offset = 12) {
  const angle = Math.atan2(ty - oy, tx - ox);
  return {
    x: ox + Math.cos(angle) * offset,
    y: oy + Math.sin(angle) * offset,
    angle,
  };
}

function pulseEntities(cx, cy, radius, spell, options = {}) {
  const {
    damage = spell.dmg || 0,
    force = 0,
    charm = 60,
    lift = -1.2,
    onceSet = null,
    keyPrefix = '',
  } = options;
  let hits = 0;
  for (const entity of activeEntities()) {
    if (onceSet) {
      const key = `${keyPrefix}${entity.x | 0}:${entity.y | 0}:${entity.type}`;
      if (onceSet.has(key)) continue;
      onceSet.add(key);
    }
    const c = bodyCenter(entity);
    const dx = c.x - cx;
    const dy = c.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    const pct = 1 - dist / radius;
    if (damage > 0) hurtEntity(entity, Math.max(1, Math.round(damage * (0.35 + pct * 0.65))), cx, cy);
    if (force > 0 && dist > 1) {
      entity.vx += (dx / dist) * force * pct / (entity.mass || 1);
      entity.vy += (dy / dist) * force * pct / (entity.mass || 1) + lift;
    }
    applyCharm(entity, charm);
    spawnP(c.x, c.y, spell.c2, 3, 'sparkle');
    hits += 1;
  }
  if (hits > 0) applyJoy(Math.min(10, hits * 1.5), Math.min(5, hits * 0.6), hits);
  return hits;
}

function drawTemptationGlyph(X, x, y, size, color, alpha = 1) {
  const s = Math.max(1, size);
  X.save();
  X.globalAlpha *= alpha;
  X.fillStyle = color;
  X.fillRect(x - 3 * s, y - s, 2 * s, s);
  X.fillRect(x + s, y - s, 2 * s, s);
  X.fillRect(x - 4 * s, y, 8 * s, s);
  X.fillRect(x - 3 * s, y + s, 6 * s, s);
  X.fillRect(x - s, y + 2 * s, 2 * s, s);
  X.fillStyle = '#050005';
  X.globalAlpha *= 0.85;
  X.fillRect(x - 2 * s, y + s, 4 * s, Math.max(1, s * 0.6));
  X.restore();
}

function drawCensorBars(X, cx, cy, width, color = '#050005', alpha = 0.8) {
  X.save();
  X.globalAlpha *= alpha;
  X.fillStyle = color;
  X.fillRect(cx - width * 0.5, cy - 10, width, 5);
  X.fillRect(cx - width * 0.38, cy + 6, width * 0.76, 5);
  X.globalAlpha *= 0.55;
  X.fillStyle = '#ff2f75';
  X.fillRect(cx - width * 0.48, cy - 12, width * 0.36, 2);
  X.fillRect(cx + width * 0.08, cy + 4, width * 0.28, 2);
  X.restore();
}

function drawVelvetSilhouette(X, cx, cy, scale, color = '#080006', c2 = '#ff2d77', alpha = 0.7) {
  const s = Math.max(0.5, scale);
  X.save();
  X.translate(cx, cy);
  X.scale(s, s);
  X.globalAlpha *= alpha;
  X.fillStyle = color;
  X.beginPath();
  X.moveTo(0, -38);
  X.bezierCurveTo(-13, -34, -18, -18, -10, -8);
  X.bezierCurveTo(-24, 3, -20, 27, -4, 33);
  X.bezierCurveTo(-10, 16, -6, 3, 0, -2);
  X.bezierCurveTo(6, 3, 10, 16, 4, 33);
  X.bezierCurveTo(20, 27, 24, 3, 10, -8);
  X.bezierCurveTo(18, -18, 13, -34, 0, -38);
  X.closePath();
  X.fill();
  X.globalAlpha *= 0.75;
  X.strokeStyle = c2;
  X.lineWidth = 1.2;
  X.beginPath();
  X.moveTo(-15, -20);
  X.bezierCurveTo(-3, -9, 3, -9, 15, -20);
  X.stroke();
  drawCensorBars(X, 0, -10, 30, '#050005', 0.95);
  X.restore();
}

function drawStageCurtains(X, color, alpha = 0.35) {
  X.save();
  X.globalAlpha *= alpha;
  X.fillStyle = color;
  X.beginPath();
  X.moveTo(0, 0);
  X.lineTo(82, 0);
  X.quadraticCurveTo(52, 170, 0, 500);
  X.closePath();
  X.fill();
  X.beginPath();
  X.moveTo(800, 0);
  X.lineTo(718, 0);
  X.quadraticCurveTo(748, 170, 800, 500);
  X.closePath();
  X.fill();
  X.globalAlpha *= 0.55;
  for (let x = 16; x < 96; x += 18) X.fillRect(x, 0, 3, 500);
  for (let x = 704; x < 790; x += 18) X.fillRect(x, 0, 3, 500);
  X.restore();
}

function drawFilmBlackout(X, alpha = 0.4) {
  X.save();
  X.globalAlpha *= alpha;
  X.fillStyle = '#030003';
  X.fillRect(0, 0, 800, 44);
  X.fillRect(0, 456, 800, 44);
  X.restore();
}

function drawPixelDiamond(X, x, y, size, color, alpha = 1) {
  X.save();
  X.globalAlpha *= alpha;
  X.fillStyle = color;
  for (let row = -size; row <= size; row++) {
    const w = size - Math.abs(row) + 1;
    X.fillRect(x - w, y + row * 2, w * 2, 2);
  }
  X.restore();
}

function drawRibbon(X, points, color, width = 3, alpha = 0.8) {
  if (points.length < 2) return;
  X.save();
  X.globalAlpha *= alpha;
  X.strokeStyle = color;
  X.lineWidth = width;
  X.lineCap = 'round';
  X.lineJoin = 'round';
  X.beginPath();
  X.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) X.lineTo(points[i].x, points[i].y);
  X.stroke();
  X.restore();
}

function drawRadialVeil(X, cx, cy, radius, color, c2, alpha = 0.2) {
  const grad = X.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `${color}66`);
  grad.addColorStop(0.55, `${c2}33`);
  grad.addColorStop(1, 'transparent');
  X.save();
  X.globalAlpha = alpha;
  X.fillStyle = grad;
  X.beginPath();
  X.arc(cx, cy, radius, 0, Math.PI * 2);
  X.fill();
  X.restore();
}

export const SPELL_DEFS = [
  {
    name: 'Velvet Bite', icon: '◆', key: '1', category: 'Tempt',
    ...palette('velvet'),
    speed: 9, dmg: 13, mana: 12, cd: 260, r: 5, grav: 0, drag: 0.997, bounce: 1, exR: 12, exF: 2,
    trail: 'lust', isVelvetBite: true, lustStyle: 'velvet', charmDur: 110, charmR: 62,
    desc: 'A redlight velvet glyph snaps shut on impact, cutting to a censor-bar close-up'
  },
  {
    name: 'Redlight Perfume', icon: '✦', key: '2', category: 'Aura',
    ...palette('perfume'),
    speed: 0, dmg: 4, mana: 22, cd: 760, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isScentSpiral: true, lustStyle: 'perfume', zoneR: 92, zoneDur: 210,
    desc: 'Cinematic perfume coils under redlight neon, dragging enemies into a fever haze'
  },
  {
    name: 'Cabaret Blackout', icon: '▰', key: '3', category: 'Pulse',
    ...palette('blush'),
    speed: 0, dmg: 16, mana: 24, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isBlushBloom: true, lustStyle: 'blush', bloomR: 150, bloomDur: 120,
    desc: 'Cabaret curtains slam into blackout, then a hot silhouette flash stuns the room'
  },
  {
    name: 'Silk Bind', icon: '∞', key: '4', category: 'Bind',
    ...palette('silk'),
    speed: 0, dmg: 7, mana: 20, cd: 680, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isSilkenLasso: true, lustStyle: 'silk', lassoR: 135, lassoDur: 115,
    desc: 'Silk restraints cinch the nearest target into a staged, censor-lit tug'
  },
  {
    name: 'Afterglow Dash', icon: '»', key: '5', category: 'Dash',
    ...palette('afterglow'),
    speed: 0, dmg: 0, mana: 18, cd: 920, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isAfterglowDash: true, lustStyle: 'afterglow', dashDur: 14, dashSpeed: 23, dashR: 36,
    desc: 'Dash through a heated film splice, leaving lipstick neon and breathy afterimages'
  },
  {
    name: 'Heat Rhythm', icon: '♫', key: '6', category: 'Rhythm',
    ...palette('rhythm'),
    speed: 0, dmg: 8, mana: 26, cd: 1050, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isPulseRhythm: true, lustStyle: 'rhythm', beatR: 128, beatGap: 18, beatCount: 6,
    desc: 'A forbidden club beat punches through black film bars and red velvet light'
  },
  {
    name: 'Boudoir Mirror', icon: '◇', key: '7', category: 'Illusion',
    ...palette('mirror'),
    speed: 0, dmg: 20, mana: 30, cd: 1250, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isMirrorCrush: true, lustStyle: 'mirror', mirrorR: 120, mirrorDur: 120,
    desc: 'Boudoir mirrors tease censored silhouettes before shattering into glassy cuts'
  },
  {
    name: 'Censor Veil', icon: '▦', key: '8', category: 'Veil',
    ...palette('mosaic'),
    speed: 0, dmg: 5, mana: 24, cd: 1100, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isMosaicVeil: true, lustStyle: 'mosaic', veilR: 76, veilDur: 180,
    desc: 'Pixel censor bars orbit the caster, turning pressure into voyeur neon focus'
  },
  {
    name: 'Velvet Rope', icon: '◉', key: '9', category: 'Ward',
    ...palette('ward'),
    speed: 0, dmg: 6, mana: 28, cd: 1180, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isVelvetWard: true, lustStyle: 'ward', wardR: 84, wardDur: 170,
    desc: 'Drop a velvet rope stage ward that rejects intruders with suggestive red pulses'
  },
  {
    name: 'Forbidden Encore', icon: '✹', key: '0', category: 'Ultimate',
    ...palette('euphoria'),
    speed: 0, dmg: 42, mana: 82, cd: 6200, r: 0, grav: 0, drag: 1, bounce: 0, exR: 0, exF: 0,
    trail: 'lust', isEuphoriaBloom: true, lustStyle: 'euphoria', bloomR: 310, bloomDur: 230,
    desc: 'Ultimate redlight stage ritual: curtains, silhouettes, censor bars, neon climax'
  },
];

export const FIRE_HANDLERS = {
  isScentSpiral(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'lust_scent_spiral', state: 0, age: 0, cx: tx, cy: ty, spell: s, seed: Math.random() * 100 });
    SoundFX.playSweep(500, 900, 'sine', 0.14, 0.18);
    return true;
  },

  isBlushBloom(s) {
    const c = playerCenter();
    state.vfxSequences.push({ type: 'lust_blush_bloom', state: 0, age: 0, cx: c.x, cy: c.y, spell: s, hitKeys: new Set() });
    SoundFX.playSweep(360, 820, 'triangle', 0.2, 0.24);
    return true;
  },

  isSilkenLasso(s, ox, oy, tx, ty) {
    const target = nearestEntity(tx, ty, s.lassoR);
    state.vfxSequences.push({ type: 'lust_silken_lasso', state: 0, age: 0, ox, oy, tx, ty, target, spell: s, knots: [] });
    SoundFX.playSweep(780, 420, 'sine', 0.12, 0.16);
    return true;
  },

  isAfterglowDash(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'lust_afterglow_dash', state: 0, age: 0, angle: Math.atan2(ty - oy, tx - ox), spell: s, trail: [], hitSet: new Set() });
    SoundFX.playNoise(0.18, 0.18, 640, 'bandpass', 5);
    return true;
  },

  isPulseRhythm(s) {
    const c = playerCenter();
    state.vfxSequences.push({ type: 'lust_pulse_rhythm', state: 0, age: 0, cx: c.x, cy: c.y, spell: s, beat: 0 });
    SoundFX.playTone(220, 'triangle', 0.16, 0.14);
    return true;
  },

  isMirrorCrush(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'lust_mirror_crush', state: 0, age: 0, cx: tx, cy: ty, spell: s, mirrors: [] });
    SoundFX.playSweep(700, 1200, 'sine', 0.14, 0.2);
    return true;
  },

  isMosaicVeil(s) {
    state.vfxSequences.push({ type: 'lust_mosaic_veil', state: 0, age: 0, spell: s, pixels: [] });
    SoundFX.playTone(640, 'sine', 0.1, 0.2);
    return true;
  },

  isVelvetWard(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'lust_velvet_ward', state: 0, age: 0, cx: tx, cy: ty, spell: s, absorbed: 0 });
    SoundFX.playSweep(300, 620, 'triangle', 0.14, 0.18);
    return true;
  },

  isEuphoriaBloom(s) {
    const c = playerCenter();
    state.vfxSequences.push({ type: 'lust_euphoria_bloom', state: 0, age: 0, cx: c.x, cy: c.y, spell: s, wave: 0 });
    state.player.castAnim = 400;
    state.player.castType = 'up';
    SoundFX.playSweep(180, 880, 'sine', 0.22, 0.45);
    return true;
  },
};

export const PROJ_HOOKS = {
  isVelvetBite: {
    onUpdate(p, s) {
      if (p.age % 5 === 0) {
        drawTrailBurst(p.x, p.y, s);
        addLight(p.x, p.y, 28, s.color, 0.35, 4);
      }
      p.vx += Math.sin(p.age * 0.11) * 0.018;
      p.vy += Math.cos(p.age * 0.09) * 0.018;
      return false;
    },

    onLand(p, s, hitPlat, hitEntity) {
      state.vfxSequences.push({ type: 'lust_bite_hit', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
      pulseEntities(p.x, p.y, s.charmR || 58, s, { damage: s.dmg * 0.5, force: 4, charm: s.charmDur || 90 });
      applyJoy(hitEntity ? 5 : 2, hitEntity ? 1 : 0, hitEntity ? 2 : 0);
      SoundFX.playTone(620, 'sine', 0.1, 0.12);
    },
  },
};

function drawTrailBurst(x, y, s) {
  spawnP(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
}

export const TRAIL_EMITTERS = {
  lust(p, s) {
    drawTrailBurst(p.x, p.y, s);
    if (p.age % 8 === 0) spawnP(p.x, p.y, s.core, 1, 'trail');
  },
};

export const VFX_UPDATE = {
  lust_status(v) {
    let active = false;
    for (const entity of activeEntities()) {
      if ((entity.lustCharm || 0) > 0) {
        active = true;
        entity.lustCharm -= 1;
        entity.vx *= 0.94;
        entity.vy *= 0.985;
        if (entity.lustCharm % 18 === 0) {
          const c = bodyCenter(entity);
          spawnP(c.x, c.y - 6, STATUS_SPELL.c2, 1, 'sparkle');
        }
      }
    }
    const p = state.player;
    if (p && (p.lustJoy || 0) > 0) {
      active = true;
      p.lustJoy -= 1;
      if (p.lustJoy % 16 === 0) {
        spawnP(p.x + p.w / 2, p.y + 6, STATUS_SPELL.core, 1, 'sparkle');
      }
    }
    if (!active && v.age > 5) removeVfx(v);
  },

  lust_bite_hit(v) {
    const s = v.spell;
    if (v.age === 1) {
      spawnP(v.cx, v.cy, s.color, 12, 'burst');
      spawnP(v.cx, v.cy, s.core, 6, 'sparkle');
      addWave(v.cx, v.cy, s.charmR || 58, s.c2, 12);
      addLight(v.cx, v.cy, 80, s.color, 1.2, 10);
    }
    if (v.age > 22) removeVfx(v);
  },

  lust_scent_spiral(v) {
    const s = v.spell;
    if (v.age === 1) {
      addWave(v.cx, v.cy, s.zoneR, s.color, 18);
      addLight(v.cx, v.cy, 110, s.c2, 1.1, 12);
    }
    for (const entity of activeEntities()) {
      const c = bodyCenter(entity);
      const dx = v.cx - c.x;
      const dy = v.cy - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist > s.zoneR || dist < 1) continue;
      const pct = 1 - dist / s.zoneR;
      const tx = -dy / dist;
      const ty = dx / dist;
      entity.vx += (dx / dist) * 0.09 * pct + tx * 0.18 * pct;
      entity.vy += (dy / dist) * 0.06 * pct + ty * 0.08 * pct - 0.02;
      entity.vx *= 0.98;
      applyCharm(entity, 45);
      if (v.age % 24 === 0) hurtEntity(entity, s.dmg, v.cx, v.cy);
    }
    const p = state.player;
    if (p) {
      const pc = playerCenter();
      if (Math.hypot(pc.x - v.cx, pc.y - v.cy) < s.zoneR) applyJoy(0.16, 0.02, 0);
    }
    if (v.age % 2 === 0) {
      const a = v.age * 0.18 + Math.random() * Math.PI * 0.4;
      const r = Math.random() * s.zoneR;
      spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.55, Math.random() > 0.5 ? s.color : s.c2, 1, 'cloud');
    }
    addLight(v.cx, v.cy, s.zoneR * 1.2, s.color, 0.28, 3);
    if (v.age > s.zoneDur) removeVfx(v);
  },

  lust_blush_bloom(v) {
    const s = v.spell;
    if (v.age === 1) {
      applyJoy(8, 6, 6);
      spawnP(v.cx, v.cy, s.core, 25, 'sparkle');
      addWave(v.cx, v.cy, s.bloomR, s.color, 20);
    }
    const radius = Math.min(s.bloomR, v.age / s.bloomDur * s.bloomR * 1.35);
    if (v.age % 8 === 0) {
      pulseEntities(v.cx, v.cy, radius, s, { damage: s.dmg * 0.45, force: 7, charm: 90, onceSet: v.hitKeys, keyPrefix: `${v.age >> 3}:` });
      SoundFX.playTone(420 + v.age * 4, 'sine', 0.04, 0.05);
    }
    if (v.age % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      spawnP(v.cx + Math.cos(a) * radius, v.cy + Math.sin(a) * radius * 0.7, s.c2, 1, 'sparkle');
    }
    if (v.age > s.bloomDur) removeVfx(v);
  },

  lust_silken_lasso(v) {
    const s = v.spell;
    const p = state.player;
    const start = castPoint(p.x + p.w / 2 + p.facing * 10, p.y + 8, v.tx, v.ty, 0);
    if (!v.target || !v.target.active) {
      if (v.age === 1) spawnP(v.tx, v.ty, s.c2, 12, 'sparkle');
      if (v.age > 18) removeVfx(v);
      return;
    }
    const c = bodyCenter(v.target);
    const dx = start.x - c.x;
    const dy = start.y - c.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    v.target.vx += dx / dist * 0.55 / (v.target.mass || 1);
    v.target.vy += dy / dist * 0.28 / (v.target.mass || 1) - 0.04;
    v.target.vx *= 0.985;
    applyCharm(v.target, 80);
    if (v.age % 12 === 0) {
      hurtEntity(v.target, s.dmg, start.x, start.y);
      spawnP(c.x, c.y, s.color, 4, 'sparkle');
      applyJoy(1.1, 0.2, 0);
    }
    if (v.age % 8 === 0) {
      v.knots = [
        { x: start.x, y: start.y },
        { x: (start.x + c.x) * 0.5 + Math.sin(v.age * 0.13) * 24, y: (start.y + c.y) * 0.5 - 18 },
        { x: c.x, y: c.y },
      ];
    }
    addLight(c.x, c.y, 52, s.c2, 0.55, 3);
    if (v.age > s.lassoDur) {
      pulseEntities(c.x, c.y, 46, s, { damage: s.dmg * 1.2, force: 7, charm: 100 });
      addWave(c.x, c.y, 60, s.c2, 10);
      removeVfx(v);
    }
  },

  lust_afterglow_dash(v) {
    const s = v.spell;
    const p = state.player;
    if (v.age <= s.dashDur) {
      p.vx = Math.cos(v.angle) * s.dashSpeed;
      p.vy = Math.sin(v.angle) * s.dashSpeed * 0.45;
      p.castAnim = 180;
      p.castType = 'slash';
      const c = playerCenter();
      v.trail = [...(v.trail || []), { x: c.x, y: c.y, age: v.age }].slice(-12);
      for (const entity of activeEntities()) {
        if (v.hitSet.has(entity)) continue;
        const ec = bodyCenter(entity);
        if (Math.hypot(ec.x - c.x, ec.y - c.y) > s.dashR) continue;
        v.hitSet.add(entity);
        entity.vx += Math.cos(v.angle) * 9 / (entity.mass || 1);
        entity.vy += Math.sin(v.angle) * 3 - 2;
        applyCharm(entity, 80);
        applyJoy(6, 1, 3);
        spawnP(ec.x, ec.y, s.c2, 12, 'burst');
      }
      if (v.age % 2 === 0) spawnP(c.x, c.y, Math.random() > 0.5 ? s.color : s.c2, 2, 'sparkle');
      addLight(c.x, c.y, 70, s.color, 0.8, 3);
    }
    if (v.age > s.dashDur + 18) removeVfx(v);
  },

  lust_pulse_rhythm(v) {
    const s = v.spell;
    const c = playerCenter();
    v.cx = c.x;
    v.cy = c.y;
    const onBeat = v.age % s.beatGap === 1 && v.beat < s.beatCount;
    if (onBeat) {
      v.beat += 1;
      const radius = s.beatR * (0.55 + v.beat * 0.08);
      pulseEntities(v.cx, v.cy, radius, s, { damage: s.dmg, force: 5 + v.beat, charm: 70 });
      applyJoy(3, 0.8, 1);
      addWave(v.cx, v.cy, radius, v.beat % 2 ? s.color : s.c2, 12);
      SoundFX.playTone(180 + v.beat * 80, v.beat % 2 ? 'triangle' : 'sine', 0.1, 0.08);
      spawnP(v.cx, v.cy, v.beat % 2 ? s.c2 : s.core, 14, 'sparkle');
    }
    if (v.age > s.beatGap * s.beatCount + 24) removeVfx(v);
  },

  lust_mirror_crush(v) {
    const s = v.spell;
    if (v.age === 1) {
      v.mirrors = Array.from({ length: 6 }, (_, i) => {
        const a = i / 6 * Math.PI * 2;
        return { x: v.cx + Math.cos(a) * s.mirrorR * 0.72, y: v.cy + Math.sin(a) * s.mirrorR * 0.45, a };
      });
      addWave(v.cx, v.cy, s.mirrorR, s.c2, 14);
      addLight(v.cx, v.cy, 130, s.color, 1.1, 12);
    }
    if (v.age < s.mirrorDur - 22) {
      for (const entity of activeEntities()) {
        const c = bodyCenter(entity);
        const dist = Math.hypot(c.x - v.cx, c.y - v.cy);
        if (dist > s.mirrorR) continue;
        const mirror = v.mirrors[(entity.age | 0) % v.mirrors.length] || v.mirrors[0];
        const dx = mirror.x - c.x;
        const dy = mirror.y - c.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        entity.vx += dx / d * 0.22 / (entity.mass || 1);
        entity.vy += dy / d * 0.12 / (entity.mass || 1);
        applyCharm(entity, 55);
        if (v.age % 24 === 0) hurtEntity(entity, Math.max(2, s.dmg * 0.18), v.cx, v.cy);
      }
      if (v.age % 5 === 0) {
        const m = v.mirrors[(Math.random() * v.mirrors.length) | 0];
        spawnP(m.x, m.y, s.core, 1, 'sparkle');
      }
    } else if (v.state === 0) {
      v.state = 1;
      pulseEntities(v.cx, v.cy, s.mirrorR + 20, s, { damage: s.dmg, force: 10, charm: 110 });
      spawnP(v.cx, v.cy, s.core, 35, 'explode');
      addWave(v.cx, v.cy, s.mirrorR * 1.25, s.core, 18);
      SoundFX.playSweep(1200, 300, 'triangle', 0.18, 0.2);
    }
    if (v.age > s.mirrorDur) removeVfx(v);
  },

  lust_mosaic_veil(v) {
    const s = v.spell;
    const c = playerCenter();
    v.cx = c.x;
    v.cy = c.y;
    if (v.age === 1 || v.age % 20 === 0) {
      v.pixels = Array.from({ length: 22 }, (_, i) => ({
        a: i / 22 * Math.PI * 2 + Math.random() * 0.2,
        r: s.veilR * (0.45 + Math.random() * 0.5),
        size: 3 + Math.random() * 5,
        color: [s.color, s.c2, s.core][i % 3],
      }));
    }
    if (v.age % 18 === 0) applyJoy(1.2, 0.25, 0);
    for (const entity of activeEntities()) {
      const ec = bodyCenter(entity);
      const dx = ec.x - v.cx;
      const dy = ec.y - v.cy;
      const dist = Math.hypot(dx, dy);
      if (dist > s.veilR || dist < 1) continue;
      entity.vx += dx / dist * 0.38 / (entity.mass || 1);
      entity.vy += dy / dist * 0.1 / (entity.mass || 1) - 0.03;
      applyCharm(entity, 65);
      if (v.age % 28 === 0) hurtEntity(entity, s.dmg, v.cx, v.cy);
    }
    addLight(v.cx, v.cy, s.veilR * 1.2, s.color, 0.28, 3);
    if (v.age > s.veilDur) removeVfx(v);
  },

  lust_velvet_ward(v) {
    const s = v.spell;
    if (v.age === 1) {
      addWave(v.cx, v.cy, s.wardR, s.c2, 16);
      spawnP(v.cx, v.cy, s.color, 16, 'sparkle');
    }
    for (const proj of state.projectiles) {
      const dist = Math.hypot(proj.x - v.cx, proj.y - v.cy);
      if (dist > s.wardR || dist < 1) continue;
      const dx = (proj.x - v.cx) / dist;
      const dy = (proj.y - v.cy) / dist;
      const spd = Math.max(5, Math.hypot(proj.vx || 0, proj.vy || 0));
      proj.vx = dx * spd * 1.1;
      proj.vy = dy * spd * 1.1;
      v.absorbed += 1;
      spawnP(proj.x, proj.y, s.c2, 2, 'sparkle');
      applyJoy(0.25, 0, 0);
    }
    if (v.age % 20 === 0) {
      pulseEntities(v.cx, v.cy, s.wardR, s, { damage: s.dmg, force: 6, charm: 55 });
      addWave(v.cx, v.cy, s.wardR, s.color, 10);
      SoundFX.playTone(320 + (v.absorbed % 6) * 40, 'sine', 0.04, 0.08);
    }
    addLight(v.cx, v.cy, s.wardR * 1.35, s.color, 0.3, 3);
    if (v.age > s.wardDur) removeVfx(v);
  },

  lust_euphoria_bloom(v) {
    const s = v.spell;
    const c = playerCenter();
    v.cx = c.x;
    v.cy = c.y;
    state.player.castAnim = 280;
    state.player.castType = v.state === 0 ? 'up' : 'burst';

    if (v.state === 0) {
      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 250 - v.age * 3;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.55, s.c2, 1, 'sparkle');
      }
      addLight(v.cx, v.cy, 90 + v.age * 3, s.color, 0.8, 3);
      if (v.age > 44) {
        v.state = 1;
        v.age = 0;
        spawnP(v.cx, v.cy, s.core, 45, 'explode');
        addWave(v.cx, v.cy, s.bloomR, s.core, 28);
        applyJoy(18, 14, 14);
      }
      return;
    }

    if (v.state === 1) {
      if (v.age % 20 === 1 && v.wave < 5) {
        v.wave += 1;
        const radius = s.bloomR * (0.35 + v.wave * 0.16);
        pulseEntities(v.cx, v.cy, radius, s, { damage: s.dmg * (0.35 + v.wave * 0.08), force: 9 + v.wave * 2, charm: 150 });
        addWave(v.cx, v.cy, radius, v.wave % 2 ? s.color : s.c2, 22);
        SoundFX.playTone(260 + v.wave * 110, v.wave % 2 ? 'triangle' : 'sine', 0.16, 0.13);
      }
      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * s.bloomR;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.62, Math.random() > 0.5 ? s.color : s.c2, 1, 'sparkle');
      }
      addLight(v.cx, v.cy, s.bloomR, s.color, 0.55, 3);
      if (v.age > 115) {
        v.state = 2;
        v.age = 0;
      }
      return;
    }

    if (v.age % 14 === 0) applyJoy(2.2, 0.8, 0);
    if (v.age % 5 === 0) spawnP(v.cx + (Math.random() - 0.5) * 120, v.cy + (Math.random() - 0.5) * 80, s.core, 1, 'sparkle');
    if (v.age > 70) removeVfx(v);
  },
};

export const VFX_DRAW = {
  lust_status() {},

  lust_bite_hit(v, X) {
    const s = v.spell;
    const t = Math.min(1, v.age / 22);
    drawFilmBlackout(X, 0.12 * (1 - t));
    drawRadialVeil(X, v.cx, v.cy, (s.charmR || 58) * t, s.color, s.c2, 0.6 * (1 - t));
    drawCensorBars(X, v.cx, v.cy + 14, 54 * (1 - t * 0.25), '#060006', 0.8 * (1 - t * 0.2));
    drawTemptationGlyph(X, v.cx, v.cy - 4 - v.age * 0.2, 3 + t * 3, s.core, 1 - t * 0.4);
  },

  lust_scent_spiral(v, X) {
    const s = v.spell;
    const fade = Math.min(1, Math.min(v.age / 20, (s.zoneDur - v.age) / 30));
    drawStageCurtains(X, s.color, 0.08 * fade);
    drawRadialVeil(X, v.cx, v.cy, s.zoneR, s.color, s.c2, 0.38 * fade);
    X.save();
    X.translate(v.cx, v.cy);
    X.globalAlpha = 0.45 * fade;
    for (let ring = 0; ring < 4; ring++) {
      X.strokeStyle = ring % 2 ? s.c2 : s.color;
      X.lineWidth = 2 - ring * 0.25;
      X.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.18) {
        const r = (a / (Math.PI * 5)) * s.zoneR * (0.45 + ring * 0.16);
        const x = Math.cos(a + v.age * 0.045 + ring) * r;
        const y = Math.sin(a + v.age * 0.045 + ring) * r * 0.55;
        a === 0 ? X.moveTo(x, y) : X.lineTo(x, y);
      }
      X.stroke();
    }
    X.restore();
    drawVelvetSilhouette(X, v.cx, v.cy - 16, 0.55 + Math.sin(v.age * 0.05) * 0.04, '#070006', s.c2, 0.24 * fade);
  },

  lust_blush_bloom(v, X) {
    const s = v.spell;
    const radius = Math.min(s.bloomR, v.age / s.bloomDur * s.bloomR * 1.35);
    const blackout = Math.max(0.08, 0.34 * (1 - v.age / s.bloomDur));
    drawFilmBlackout(X, blackout);
    drawStageCurtains(X, s.color, Math.max(0.06, blackout));
    X.save();
    X.globalAlpha = Math.max(0, 0.75 - v.age / s.bloomDur);
    X.strokeStyle = s.color;
    X.lineWidth = 3;
    X.beginPath();
    X.ellipse(v.cx, v.cy, radius, radius * 0.62, 0, 0, Math.PI * 2);
    X.stroke();
    X.globalAlpha *= 0.75;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + v.age * 0.03;
      drawTemptationGlyph(X, v.cx + Math.cos(a) * radius, v.cy + Math.sin(a) * radius * 0.62, 1.4, i % 2 ? s.c2 : s.core, 0.9);
    }
    X.restore();
    drawVelvetSilhouette(X, v.cx, v.cy - 20, 1.02 + Math.sin(v.age * 0.1) * 0.05, '#050005', s.core, Math.max(0.16, 0.58 - v.age / (s.bloomDur * 1.8)));
    drawCensorBars(X, v.cx, v.cy - 2, 104, '#040004', Math.max(0.16, 0.46 - v.age / (s.bloomDur * 2)));
  },

  lust_silken_lasso(v, X) {
    const s = v.spell;
    const p = state.player;
    const start = { x: p.x + p.w / 2 + p.facing * 10, y: p.y + 8 };
    const end = v.target?.active ? bodyCenter(v.target) : { x: v.tx, y: v.ty };
    const mid = { x: (start.x + end.x) * 0.5 + Math.sin(v.age * 0.12) * 22, y: (start.y + end.y) * 0.5 - 18 };
    drawFilmBlackout(X, 0.045);
    drawRibbon(X, [start, mid, end], s.c2, 6, 0.28);
    drawRibbon(X, [start, mid, end], s.color, 2, 0.9);
    drawCensorBars(X, end.x, end.y - 2, 48, '#050005', 0.55);
    drawPixelDiamond(X, end.x, end.y, 5, s.core, 0.8);
  },

  lust_afterglow_dash(v, X) {
    const s = v.spell;
    const trail = v.trail || [];
    drawFilmBlackout(X, 0.05);
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const a = (i + 1) / trail.length;
      drawTemptationGlyph(X, p.x, p.y - 8, 1.2 + a * 1.8, i % 2 ? s.color : s.c2, a * 0.5);
    }
    drawRibbon(X, trail, s.c2, 8, 0.2);
    drawRibbon(X, trail, s.color, 3, 0.6);
  },

  lust_pulse_rhythm(v, X) {
    const s = v.spell;
    drawFilmBlackout(X, 0.08 + Math.sin(v.age * 0.25) * 0.025);
    X.save();
    X.translate(v.cx, v.cy);
    for (let i = 0; i < 6; i++) {
      const h = 8 + Math.sin(v.age * 0.25 + i) * 6 + (v.beat || 0) * 2;
      X.globalAlpha = 0.35;
      X.fillStyle = i % 2 ? s.color : s.c2;
      X.fillRect(-27 + i * 9, -h * 0.5, 5, h);
    }
    const beatT = (v.age % s.beatGap) / s.beatGap;
    X.globalAlpha = 0.5 * (1 - beatT);
    X.strokeStyle = v.beat % 2 ? s.color : s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.arc(0, 0, s.beatR * beatT, 0, Math.PI * 2);
    X.stroke();
    drawCensorBars(X, 0, 24, 70 + Math.sin(v.age * 0.2) * 10, '#050005', 0.35);
    X.restore();
  },

  lust_mirror_crush(v, X) {
    const s = v.spell;
    drawStageCurtains(X, s.color, 0.1);
    drawRadialVeil(X, v.cx, v.cy, s.mirrorR, s.color, s.c2, 0.18);
    X.save();
    for (const m of v.mirrors || []) {
      X.save();
      X.translate(m.x, m.y);
      X.rotate(m.a + Math.sin(v.age * 0.04) * 0.1);
      X.globalAlpha = v.state === 1 ? Math.max(0, 1 - (v.age - s.mirrorDur + 22) / 22) : 0.75;
      X.fillStyle = s.c2;
      X.fillRect(-5, -18, 10, 36);
      X.fillStyle = s.core;
      X.globalAlpha *= 0.55;
      X.fillRect(-3, -15, 3, 30);
      drawVelvetSilhouette(X, 0, 6, 0.22, '#090007', s.c2, 0.65);
      X.restore();
    }
    X.restore();
  },

  lust_mosaic_veil(v, X) {
    const s = v.spell;
    drawFilmBlackout(X, 0.04);
    drawRadialVeil(X, v.cx, v.cy, s.veilR, s.color, s.c2, 0.22);
    X.save();
    X.globalAlpha = Math.min(0.9, Math.min(v.age / 20, (s.veilDur - v.age) / 24));
    for (const pixel of v.pixels || []) {
      const a = pixel.a + v.age * 0.018;
      const x = v.cx + Math.cos(a) * pixel.r;
      const y = v.cy + Math.sin(a) * pixel.r * 0.75;
      X.fillStyle = pixel.color;
      X.fillRect(x - pixel.size / 2, y - pixel.size / 2, pixel.size, pixel.size);
    }
    for (let bar = -2; bar <= 2; bar++) {
      drawCensorBars(X, v.cx + bar * 16 + Math.sin(v.age * 0.04 + bar) * 6, v.cy + Math.cos(v.age * 0.05 + bar) * 20, 34, '#040004', 0.45);
    }
    X.restore();
  },

  lust_velvet_ward(v, X) {
    const s = v.spell;
    const fade = Math.min(1, Math.min(v.age / 16, (s.wardDur - v.age) / 24));
    drawStageCurtains(X, s.color, 0.06 * fade);
    X.save();
    X.globalAlpha = 0.5 * fade;
    X.strokeStyle = s.color;
    X.lineWidth = 3;
    X.beginPath();
    X.arc(v.cx, v.cy, s.wardR + Math.sin(v.age * 0.09) * 3, 0, Math.PI * 2);
    X.stroke();
    X.globalAlpha = 0.25 * fade;
    X.fillStyle = s.c2;
    X.beginPath();
    X.arc(v.cx, v.cy, s.wardR * 0.82, 0, Math.PI * 2);
    X.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + v.age * 0.025;
      drawTemptationGlyph(X, v.cx + Math.cos(a) * s.wardR, v.cy + Math.sin(a) * s.wardR, 1.4, i % 2 ? s.core : s.c2, 0.8);
    }
    X.strokeStyle = s.c2;
    X.lineWidth = 4;
    X.globalAlpha = 0.45 * fade;
    X.beginPath();
    X.arc(v.cx, v.cy, s.wardR * 0.58, 0.15, Math.PI * 1.35);
    X.stroke();
    drawCensorBars(X, v.cx, v.cy, s.wardR * 0.95, '#050005', 0.32 * fade);
    X.restore();
  },

  lust_euphoria_bloom(v, X) {
    const s = v.spell;
    const pulse = 0.5 + Math.sin(v.age * 0.08) * 0.18;
    drawFilmBlackout(X, v.state === 0 ? 0.2 : 0.34);
    drawStageCurtains(X, s.color, v.state === 0 ? 0.18 : 0.32);
    X.save();
    X.globalAlpha = v.state === 0 ? 0.04 + v.age / 900 : v.state === 1 ? 0.16 : Math.max(0, 0.12 - v.age / 700);
    X.fillStyle = s.color;
    X.fillRect(0, 0, 800, 500);
    X.globalAlpha = 0.28;
    X.translate(v.cx, v.cy);
    for (let ring = 0; ring < 5; ring++) {
      const radius = (v.state === 0 ? v.age * 3 : s.bloomR * (0.25 + ring * 0.15)) * (0.9 + pulse);
      X.strokeStyle = ring % 2 ? s.c2 : s.core;
      X.lineWidth = 2;
      X.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2 + v.age * 0.01 * (ring + 1);
        const rr = radius * (0.88 + Math.sin(i * 2 + v.age * 0.04) * 0.08);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr * 0.62;
        i === 0 ? X.moveTo(x, y) : X.lineTo(x, y);
      }
      X.closePath();
      X.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 - v.age * 0.018;
      drawTemptationGlyph(X, Math.cos(a) * s.bloomR * 0.62, Math.sin(a) * s.bloomR * 0.38, 1.8, i % 2 ? s.color : s.c2, 0.8);
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + v.age * 0.012;
      drawVelvetSilhouette(X, Math.cos(a) * s.bloomR * 0.32, Math.sin(a) * s.bloomR * 0.18 - 10, 0.55, '#050005', i % 2 ? s.c2 : s.core, 0.45);
    }
    drawCensorBars(X, 0, 0, 190 + Math.sin(v.age * 0.12) * 26, '#040004', 0.55);
    X.restore();
  },
};
