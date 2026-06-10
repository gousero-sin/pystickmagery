// prismatica.js — Escola de Magia Prismática
//   Luz e vitral: a luz branca é fendida em espectro. Feixes que se dividem em
//   sete cores, cacos de vitral girantes, prismas flutuantes e uma catedral de
//   luz que implode em mil estilhaços. Ao selecioná-la o player vira uma figura
//   de cristal facetado (sprite transmorfo em arcane-modular.html → drawStickman).
import { state } from '../core/state.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { createAlly } from '../core/allies.js?v=1';
import { SoundFX } from '../core/sounds.js?v=7';

const PRISM = {
  core: '#ffffff',
  glass: '#cfeaff',
  cyan: '#46e5ff',
  violet: '#9d6bff',
  rose: '#ff6ad5',
  amber: '#ffd166',
  lime: '#7cff9e',
  red: '#ff5a6a',
  lead: '#0e1830', // chumbo do vitral (linhas escuras)
};

// Espectro completo (vermelho → violeta). Base de quase todo VFX da escola.
const SPECTRUM = ['#ff5a6a', '#ff9e42', '#ffe24a', '#7cff9e', '#46e5ff', '#5b8bff', '#9d6bff'];
function spc(i) { return SPECTRUM[((i % 7) + 7) % 7]; }

// ── Helpers ──────────────────────────────────────────────────────────────────
function rmVfx(v) {
  const i = state.vfxSequences.indexOf(v);
  if (i !== -1) state.vfxSequences.splice(i, 1);
}

function enemiesInRadius(x, y, r) {
  const out = [];
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    if (Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < r) out.push(e);
  }
  return out;
}

// Dano em área que atinge apenas inimigos — nunca o próprio player nem props.
function prismBlast(x, y, r, dmg, force = 0) {
  for (const e of enemiesInRadius(x, y, r)) {
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    const d = Math.hypot(ex - x, ey - y) || 1;
    const pct = 1 - d / r;
    hurtEntity(e, Math.max(1, Math.floor(dmg * pct)), x, y);
    if (force) {
      e.vx += (ex - x) / d * force * pct / (e.mass || 1);
      e.vy += (ey - y) / d * force * pct / (e.mass || 1) - 1.4;
    }
  }
}

function snareEntity(e, frames) {
  if (!e) return;
  state.frozenEntities.set(e, Math.max(state.frozenEntities.get(e) || 0, frames));
}

// Distância de um ponto a um segmento (raio espectral perfurante).
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

// Cacos de luz coloridos disparados em leque/anel — reutilizado em vários casts.
function burstShards(x, y, n, spd, dmg, life, spread = Math.PI * 2, base = 0) {
  for (let i = 0; i < n; i++) {
    const a = base + (spread >= Math.PI * 2 ? (i / n) * Math.PI * 2 : (i - (n - 1) / 2) * (spread / n)) + (Math.random() - 0.5) * 0.2;
    state.projectiles.push(createPlayerProjectile({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1,
      spell: { name: 'Light Shard', color: spc(i), c2: PRISM.core, core: PRISM.core, dmg, r: 2, grav: 0.04, drag: 0.99, trail: 'prism_dust' },
      life, growR: 2, growDmg: dmg, hitList: [],
    }));
  }
}

// Painel de vitral: grade de chumbo com células coloridas. Coração visual da escola.
function drawVitral(X, cx, cy, w, h, rot, alpha, age, cols = 4, rows = 4) {
  X.save();
  X.translate(cx, cy);
  X.rotate(rot);
  const cw = w / cols, ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -w / 2 + c * cw, py = -h / 2 + r * ch;
      const shimmer = 0.5 + Math.sin(age * 0.06 + (r + c) * 0.9) * 0.5;
      X.globalAlpha = alpha * (0.3 + shimmer * 0.55);
      X.fillStyle = spc(r * cols + c + (age * 0.02 | 0));
      X.fillRect(px + 1, py + 1, cw - 2, ch - 2);
    }
  }
  // Chumbo
  X.globalAlpha = alpha * 0.9;
  X.strokeStyle = PRISM.lead;
  X.lineWidth = 1.4;
  for (let c = 0; c <= cols; c++) { X.beginPath(); X.moveTo(-w / 2 + c * cw, -h / 2); X.lineTo(-w / 2 + c * cw, h / 2); X.stroke(); }
  for (let r = 0; r <= rows; r++) { X.beginPath(); X.moveTo(-w / 2, -h / 2 + r * ch); X.lineTo(w / 2, -h / 2 + r * ch); X.stroke(); }
  X.restore();
  X.globalAlpha = 1;
}

// Rosácea: pétalas radiais de vitral girando.
function drawRose(X, cx, cy, r, petals, alpha, age) {
  X.save();
  X.translate(cx, cy);
  X.rotate(age * 0.01);
  X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    X.save();
    X.rotate(a);
    X.globalAlpha = alpha * (0.45 + Math.sin(age * 0.05 + i) * 0.3);
    X.fillStyle = spc(i);
    X.beginPath();
    X.moveTo(r * 0.28, 0);
    X.quadraticCurveTo(r * 0.6, -r * 0.18, r, 0);
    X.quadraticCurveTo(r * 0.6, r * 0.18, r * 0.28, 0);
    X.fill();
    X.restore();
  }
  // Aro de chumbo
  X.globalCompositeOperation = 'source-over';
  X.globalAlpha = alpha * 0.7;
  X.strokeStyle = PRISM.lead;
  X.lineWidth = 1.6;
  X.beginPath(); X.arc(0, 0, r, 0, Math.PI * 2); X.stroke();
  X.beginPath(); X.arc(0, 0, r * 0.28, 0, Math.PI * 2); X.stroke();
  X.restore();
  X.globalAlpha = 1;
}

// Glow radial aditivo genérico.
function glow(X, x, y, r, color, alpha) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  X.globalAlpha = alpha;
  X.fillStyle = g;
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fill();
  X.restore();
  X.globalAlpha = 1;
}

// ── Spell Definitions ─────────────────────────────────────────────────────────
export const SPELL_DEFS = [
  {
    name: 'Prism Bolt', icon: '🔆', key: '1', category: 'Common',
    color: PRISM.cyan, c2: PRISM.violet, core: PRISM.core,
    speed: 14, dmg: 8, mana: 7, cd: 260, r: 3, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_bolt', isPrismBolt: true,
    desc: 'Feixe de luz branca que se estilhaça em cacos coloridos no impacto.',
  },
  {
    name: 'Refract', icon: '🌈', key: '2', category: 'Cast',
    color: PRISM.rose, c2: PRISM.cyan, core: PRISM.core,
    speed: 12, dmg: 6, mana: 14, cd: 720, r: 3, grav: 0.01, drag: 1, bounce: 0,
    trail: 'prism_dust', isRefract: true,
    desc: 'Separa a luz em três feixes — vermelho, verde e azul — que abrem em leque.',
  },
  {
    name: 'Spectrum Ray', icon: '📐', key: '3', category: 'Ray',
    color: PRISM.cyan, c2: PRISM.violet, core: PRISM.core,
    speed: 0, dmg: 16, mana: 22, cd: 1500, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isSpectrumRay: true, rayLen: 540, rayW: 17,
    desc: 'Raio prismático que perfura em linha reta e dispersa cacos na ponta.',
  },
  {
    name: 'Iris Nova', icon: '💠', key: '4', category: 'Pulse',
    color: PRISM.violet, c2: PRISM.rose, core: PRISM.core,
    speed: 0, dmg: 12, mana: 20, cd: 1700, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isIrisNova: true, novaR: 124,
    desc: 'Detona um anel de luz espectral ao redor, ferindo e repelindo inimigos.',
  },
  {
    name: 'Prism Sentinel', icon: '🔮', key: '5', category: 'Summon',
    color: PRISM.cyan, c2: PRISM.amber, core: PRISM.core,
    speed: 0, dmg: 7, mana: 34, cd: 2800, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isPrismSentinel: true, sentinelDur: 400, sentinelRate: 30,
    desc: 'Invoca um prisma flutuante que fragmenta a luz em feixes contra inimigos.',
  },
  {
    name: 'Stained Mosaic', icon: '🪟', key: '6', category: 'Structure',
    color: PRISM.amber, c2: PRISM.rose, core: PRISM.core,
    speed: 0, dmg: 6, mana: 28, cd: 2600, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isMosaic: true, mosaicDur: 440, mosaicW: 96, mosaicH: 78,
    desc: 'Ergue um painel de vitral que fragmenta a luz e fere inimigos próximos.',
  },
  {
    name: 'Coruscate', icon: '💥', key: '7', category: 'Cast',
    color: PRISM.core, c2: PRISM.cyan, core: PRISM.core,
    speed: 0, dmg: 5, mana: 24, cd: 2200, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isCoruscate: true, flashR: 158, flashSnare: 96,
    desc: 'Clarão prismático cegante que prende e atordoa os inimigos próximos.',
  },
  {
    name: 'Lightstride', icon: '✦', key: '8', category: 'Dash',
    color: PRISM.cyan, c2: PRISM.violet, core: PRISM.core,
    speed: 0, dmg: 0, mana: 20, cd: 1300, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isLightstride: true, strideRange: 205, strideWind: 6, strideTravel: 7, stridePush: 6,
    desc: 'Refrata-se em um feixe e reaparece adiante, dispersando quem estiver perto.',
  },
  {
    name: 'Rose Window', icon: '🌸', key: '9', category: 'Ward',
    color: PRISM.rose, c2: PRISM.amber, core: PRISM.core,
    speed: 0, dmg: 10, mana: 36, cd: 5000, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isRoseWard: true, wardDur: 200, wardR: 98,
    desc: 'Uma rosácea de vitral gira ao redor, absorve dano e estilhaça em cacos de luz.',
  },
  {
    name: 'Cathedral of Light', icon: '⛪', key: '0', category: 'Ultimate',
    color: PRISM.core, c2: PRISM.violet, core: PRISM.core,
    speed: 0, dmg: 20, mana: 92, cd: 12000, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'prism_dust', isCathedral: true,
    desc: 'Ergue uma catedral de vitral que implode em mil cacos de luz (Ultimate).',
  },
];

// ── FIRE_HANDLERS ──────────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  isRefract(s, ox, oy, tx, ty) {
    const a0 = Math.atan2(ty - oy, tx - ox);
    const cols = [PRISM.red, PRISM.lime, PRISM.cyan];
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i - 1) * 0.22;
      state.projectiles.push(createPlayerProjectile({
        x: ox, y: oy,
        vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        spell: { name: 'Refracted Beam', color: cols[i], c2: PRISM.core, core: PRISM.core, dmg: s.dmg, r: s.r, grav: s.grav, drag: 1, trail: 'prism_dust' },
        life: 82, growR: s.r, growDmg: s.dmg, hitList: [],
      }));
    }
    SoundFX.playSweep(520, 960, 'sine', 0.25, 0.2);
    return true;
  },

  isSpectrumRay(s, ox, oy, tx, ty) {
    const a = Math.atan2(ty - oy, tx - ox);
    const ex = ox + Math.cos(a) * s.rayLen, ey = oy + Math.sin(a) * s.rayLen;
    state.vfxSequences.push({ type: 'prism_ray', state: 0, age: 0, x1: ox, y1: oy, x2: ex, y2: ey, ang: a, spell: s });
    SoundFX.playSweep(900, 320, 'sawtooth', 0.3, 0.22);
    return true;
  },

  isIrisNova(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({ type: 'prism_iris_nova', state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s });
    SoundFX.playSweep(300, 720, 'triangle', 0.3, 0.25);
    return true;
  },

  isPrismSentinel(s, ox, oy, tx, ty) {
    const cx = tx, cy = ty - 24;
    const ally = createAlly({ x: cx - 7, y: cy - 7, w: 14, h: 14, mana: Math.round(s.mana / 2), threat: 30, type: 'ally-prism-sentinel', color: s.color, c2: s.c2 });
    state.entities.push(ally);
    state.vfxSequences.push({ type: 'prism_sentinel', state: 0, age: 0, cx, cy, spell: s, ally });
    SoundFX.playTone(660, 'sine', 0.16, 0.18);
    return true;
  },

  isMosaic(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'prism_mosaic', state: 0, age: 0, cx: tx, cy: ty, spell: s });
    SoundFX.playTone(420, 'triangle', 0.2, 0.2);
    return true;
  },

  isCoruscate(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'prism_coruscate', state: 0, age: 0, cx: tx, cy: ty, spell: s });
    SoundFX.playNoise(0.22, 0.35, 1200, 'highpass');
    return true;
  },

  isLightstride(s, ox, oy, tx, ty) {
    const p = state.player;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    const dx = tx - px, dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.min(s.strideRange, len);
    const nx = Math.max(20, Math.min(state.W - 20, px + dx / len * dist));
    const ny = Math.max(28, Math.min(state.H - 30, py + dy / len * dist));
    state.vfxSequences.push({ type: 'prism_lightstride', state: 0, age: 0, fx: px, fy: py, tx: nx, ty: ny, spell: s });
    SoundFX.playSweep(560, 1100, 'sine', 0.4, 0.28);
    return true;
  },

  isRoseWard(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({ type: 'prism_rose_ward', state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s, prevInv: !!p.inv });
    p.inv = true;
    SoundFX.playSweep(320, 640, 'sine', 0.3, 0.3);
    return true;
  },

  isCathedral(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({ type: 'prism_cathedral', state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s, prevInv: !!p.inv, strikes: 0 });
    p.inv = true;
    p.prismaticUlt = true;
    SoundFX.playSweep(180, 80, 'sine', 0.6, 0.6);
    return true;
  },
};

// ── PROJ_HOOKS ──────────────────────────────────────────────────────────────────
export const PROJ_HOOKS = {
  // Prism Bolt: o dano-base já foi aplicado pelo engine; aqui só dispersa cacos.
  prism_bolt: {
    onLand(p, s, hitPlat, hitEntity) {
      state.vfxSequences.push({ type: 'prism_shatter', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
      const back = Math.atan2(p.vy, p.vx) + Math.PI;
      burstShards(p.x, p.y, 5, 6, Math.max(1, Math.round(s.dmg * 0.4)), 26, Math.PI * 0.9, back);
      SoundFX.playTone(940, 'triangle', 0.1, 0.1);
      return true;
    },
  },
};

// ── TRAIL_EMITTERS ─────────────────────────────────────────────────────────────
export const TRAIL_EMITTERS = {
  prism_bolt(p, s) {
    spawnP(p.x, p.y, PRISM.core, 1, 'trail');
    if (p.age % 3 === 0) spawnP(p.x, p.y, spc(p.age), 1, 'sparkle');
  },
  prism_dust(p, s) {
    spawnP(p.x, p.y, p.color || s.color, 1, 'trail');
    if (Math.random() < 0.35) spawnP(p.x, p.y, PRISM.core, 1, 'sparkle');
  },
};

// ── PROJ_DRAW ──────────────────────────────────────────────────────────────────
export const PROJ_DRAW = {
  // Prism Bolt: núcleo branco facetado com borda iridescente.
  prism_bolt(p, s, X) {
    const r = p.growR || s.r;
    glow(X, p.x, p.y, r * 4, PRISM.cyan, 0.5);
    X.save();
    X.translate(p.x, p.y);
    X.rotate(Math.atan2(p.vy, p.vx));
    // Losango de cristal
    X.fillStyle = PRISM.core;
    X.beginPath();
    X.moveTo(r * 2.2, 0); X.lineTo(0, -r); X.lineTo(-r * 1.4, 0); X.lineTo(0, r);
    X.closePath(); X.fill();
    // Borda espectral
    X.globalAlpha = 0.8;
    X.strokeStyle = spc(p.age);
    X.lineWidth = 1.2;
    X.stroke();
    X.restore();
    X.globalAlpha = 1;
  },
};

// ── VFX_UPDATE ──────────────────────────────────────────────────────────────────
export const VFX_UPDATE = {
  prism_shatter(v) {
    if (v.age === 1) { spawnP(v.cx, v.cy, PRISM.core, 8, 'burst'); state.shake(2); }
    if (v.age > 18) rmVfx(v);
  },

  prism_ray(v) {
    const s = v.spell;
    if (v.state === 0) {
      // Impacto único ao longo do segmento.
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (distToSegment(e.x + e.w / 2, e.y + e.h / 2, v.x1, v.y1, v.x2, v.y2) < s.rayW) {
          hurtEntity(e, s.dmg, v.x1, v.y1);
          const a = v.ang;
          e.vx += Math.cos(a) * 5; e.vy += Math.sin(a) * 5 - 1;
          spawnP(e.x + e.w / 2, e.y + e.h / 2, spc(v.age), 6, 'sparkle');
        }
      }
      burstShards(v.x2, v.y2, 6, 5, Math.max(1, Math.round(s.dmg * 0.3)), 30, Math.PI, v.ang);
      state.dynamicLights.push({ x: (v.x1 + v.x2) / 2, y: (v.y1 + v.y2) / 2, r: 200, color: PRISM.cyan, int: 1.6, life: 8, ml: 8 });
      state.shake(5);
      v.state = 1; v.age = 0;
    } else if (v.age > 14) rmVfx(v);
  },

  prism_iris_nova(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x + p.w / 2; v.cy = p.y + p.h / 2;
    if (v.age === 1) {
      prismBlast(v.cx, v.cy, s.novaR, s.dmg, 9);
      for (let k = 0; k < 4; k++) state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.novaR * (0.6 + k * 0.18), life: 12 + k * 2, maxLife: 12 + k * 2, color: spc(k * 2) });
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.novaR * 1.4, color: PRISM.core, int: 2.4, life: 10, ml: 10 });
      state.shake(8);
      burstShards(v.cx, v.cy, 7, 6.5, Math.max(1, Math.round(s.dmg * 0.35)), 30);
      spawnP(v.cx, v.cy, PRISM.core, 22, 'explode');
    }
    if (v.age > 22) rmVfx(v);
  },

  prism_sentinel(v) {
    const s = v.spell, b = v.ally;
    if (!b || !b.active || b.hp <= 0) { if (b) b.active = false; rmVfx(v); return; }
    // Flutua com leve oscilação; sincroniza o corpo-aliado.
    v.cy = v.cy; // âncora vertical mantida
    const bob = Math.sin(v.age * 0.12) * 6;
    b.x = v.cx - b.w / 2;
    b.y = v.cy - b.h / 2 + bob;
    // Dispara feixe colorido no inimigo mais próximo.
    if (v.age % s.sentinelRate === 0) {
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      const tgt = nearestEnemyEntity(bx, by, 360);
      if (tgt) {
        const a = Math.atan2(tgt.y + tgt.h / 2 - by, tgt.x + tgt.w / 2 - bx);
        const col = spc(v.age * 0.1 | 0);
        state.projectiles.push(createPlayerProjectile({
          x: bx, y: by,
          vx: Math.cos(a) * 11, vy: Math.sin(a) * 11,
          spell: { name: 'Sentinel Beam', color: col, c2: PRISM.core, core: PRISM.core, dmg: s.dmg, r: 3, grav: 0, drag: 1, trail: 'prism_dust' },
          life: 70, growR: 3, growDmg: s.dmg, hitList: [],
        }));
        spawnP(bx, by, col, 4, 'sparkle');
        SoundFX.playTone(780, 'sine', 0.08, 0.08);
      }
    }
    if (Math.random() < 0.4) spawnP(b.x + b.w / 2, b.y + b.h / 2, spc(v.age), 1, 'sparkle');
    if (v.age > s.sentinelDur) {
      b.active = false;
      spawnP(v.cx, v.cy, PRISM.core, 14, 'burst');
      rmVfx(v);
    }
  },

  prism_mosaic(v) {
    const s = v.spell;
    if (v.age === 1) { spawnP(v.cx, v.cy, s.c2, 12, 'burst'); state.shake(3); }
    // Fere inimigos que tocam o painel.
    if (v.age % 16 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
        if (Math.abs(ex - v.cx) < s.mosaicW / 2 + 6 && Math.abs(ey - v.cy) < s.mosaicH / 2 + 6) {
          hurtEntity(e, s.dmg, v.cx, v.cy);
          e.vx += (ex - v.cx > 0 ? 1 : -1) * 2.4;
          spawnP(ex, ey, spc(v.age), 4, 'sparkle');
        }
      }
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: 70, color: spc(v.age * 0.1 | 0), int: 0.5, life: 2, ml: 2 });
    if (v.age > s.mosaicDur) {
      burstShards(v.cx, v.cy, 8, 6, Math.max(1, Math.round(s.dmg * 0.5)), 30);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.mosaicW, life: 12, maxLife: 12, color: PRISM.core });
      spawnP(v.cx, v.cy, PRISM.core, 18, 'explode');
      state.shake(5);
      SoundFX.playNoise(0.3, 0.3, 900, 'highpass');
      rmVfx(v);
    }
  },

  prism_coruscate(v) {
    const s = v.spell;
    if (v.age === 1) {
      for (const e of enemiesInRadius(v.cx, v.cy, s.flashR)) {
        snareEntity(e, s.flashSnare);
        hurtEntity(e, s.dmg, v.cx, v.cy);
        spawnP(e.x + e.w / 2, e.y + e.h / 2, PRISM.core, 6, 'sparkle');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.flashR * 1.6, color: PRISM.core, int: 3.2, life: 12, ml: 12 });
      state.shake(7);
      burstShards(v.cx, v.cy, 7, 5, 2, 24);
    }
    if (v.age > 20) rmVfx(v);
  },

  prism_lightstride(v) {
    const s = v.spell, p = state.player;
    if (v.state === 0) {
      p.inv = true; p.vx *= 0.4; p.vy *= 0.4;
      if (v.age === 1) spawnP(v.fx, v.fy, s.c2, 14, 'sparkle');
      if (v.age % 2 === 0) spawnP(v.fx + (Math.random() - 0.5) * 18, v.fy + (Math.random() - 0.5) * 26, spc(v.age), 1, 'sparkle');
      if (v.age >= s.strideWind) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      const t = Math.min(1, v.age / s.strideTravel);
      const ease = t * t * (3 - 2 * t);
      p.x = v.fx + (v.tx - v.fx) * ease - p.w / 2;
      p.y = v.fy + (v.ty - v.fy) * ease - p.h / 2;
      p.vx = 0; p.vy = 0;
      spawnP(p.x + p.w / 2, p.y + p.h / 2, spc(v.age), 2, 'sparkle');
      state.dynamicLights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 64, color: PRISM.core, int: 1.4, life: 2, ml: 2 });
      if (v.age >= s.strideTravel) {
        v.state = 2; v.age = 0;
        const sx = p.x + p.w / 2, sy = p.y + p.h / 2;
        // Dispersão puramente de controle (Dash não-letal): só empurra.
        for (const e of enemiesInRadius(sx, sy, 66)) {
          const a = Math.atan2(e.y + e.h / 2 - sy, e.x + e.w / 2 - sx);
          e.vx += Math.cos(a) * s.stridePush;
          e.vy += Math.sin(a) * s.stridePush - 2;
        }
        state.shockwaves.push({ x: sx, y: sy, r: 0, maxR: 66, life: 12, maxLife: 12, color: PRISM.core });
        state.shake(6);
        spawnP(sx, sy, PRISM.core, 16, 'burst');
        SoundFX.playSweep(280, 760, 'sine', 0.35, 0.2);
      }
    } else {
      p.inv = false;
      if (v.age > 8) rmVfx(v);
    }
  },

  prism_rose_ward(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x + p.w / 2; v.cy = p.y + p.h / 2;
    if (v.state === 0) {
      p.inv = true;
      if (v.age % 5 === 0) {
        const a = Math.random() * Math.PI * 2;
        spawnP(v.cx + Math.cos(a) * 30, v.cy + Math.sin(a) * 30, spc(v.age), 1, 'sparkle');
      }
      if (v.age > s.wardDur) {
        v.state = 1; v.age = 0;
        p.inv = v.prevInv;
        prismBlast(v.cx, v.cy, s.wardR, s.dmg, 8);
        burstShards(v.cx, v.cy, 8, 6.5, Math.max(1, Math.round(s.dmg * 0.5)), 32);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.wardR, life: 14, maxLife: 14, color: PRISM.core });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.wardR * 1.6, color: PRISM.core, int: 2.6, life: 12, ml: 12 });
        state.shake(8);
        spawnP(v.cx, v.cy, PRISM.core, 24, 'explode');
        SoundFX.playNoise(0.4, 0.3, 700, 'highpass');
      }
    } else if (v.age > 12) rmVfx(v);
  },

  prism_cathedral(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x + p.w / 2; v.cy = p.y + p.h / 2;
    p.vx *= 0.6;
    if (v.state === 0) { // ascensão da catedral
      p.inv = true;
      if (v.age === 1) { state.shake(8); SoundFX.playNoise(0.5, 0.5, 400, 'bandpass', 4); }
      state.shake(Math.min(v.age / 12, 5));
      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2, d = 140;
        state.particles.push({ x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d, vx: 0, vy: -2 - Math.random() * 2, life: 40, ml: 40, color: spc(v.age), size: 2, grav: -0.02, type: 'sparkle' });
      }
      if (v.age > 54) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) { // radiância: feixes de luz batem nos inimigos
      if (v.age % 12 === 0 && v.strikes < 9) {
        v.strikes++;
        const tgt = nearestEnemyEntity(v.cx + (Math.random() - 0.5) * 220, v.cy + (Math.random() - 0.5) * 120, 360);
        const ix = tgt ? tgt.x + tgt.w / 2 : v.cx + (Math.random() - 0.5) * 240;
        const iy = tgt ? tgt.y + tgt.h / 2 : v.cy + (Math.random() - 0.5) * 110;
        prismBlast(ix, iy, 62, s.dmg, 6);
        state.shockwaves.push({ x: ix, y: iy, r: 0, maxR: 62, life: 10, maxLife: 10, color: spc(v.strikes) });
        state.dynamicLights.push({ x: ix, y: iy, r: 120, color: PRISM.core, int: 2.2, life: 8, ml: 8 });
        state.shake(7);
        spawnP(ix, iy, PRISM.core, 16, 'explode');
        SoundFX.playSweep(1100, 480, 'sine', 0.25, 0.16);
      }
      if (v.strikes >= 9 || v.age > 140) { v.state = 2; v.age = 0; }
    } else { // implosão final: mil cacos de luz
      if (v.age === 1) {
        p.inv = v.prevInv;
        p.prismaticUlt = false;
        prismBlast(v.cx, v.cy, 200, s.dmg * 1.6, 12);
        burstShards(v.cx, v.cy, 14, 8, Math.max(1, Math.round(s.dmg * 0.6)), 40);
        for (let k = 0; k < 7; k++) state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 120 + k * 28, life: 14 + k * 3, maxLife: 14 + k * 3, color: spc(k) });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 360, color: PRISM.core, int: 4.5, life: 14, ml: 14 });
        state.shake(28);
        spawnP(v.cx, v.cy, PRISM.core, 44, 'explode');
        SoundFX.playSweep(220, 1400, 'sawtooth', 0.6, 0.5);
      }
      if (v.age > 42) { p.prismaticUlt = false; rmVfx(v); }
    }
  },
};

// ── VFX_DRAW ────────────────────────────────────────────────────────────────────
export const VFX_DRAW = {
  prism_shatter(v, X) {
    const a = Math.max(0, 1 - v.age / 18);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + v.age * 0.06;
      const r = 4 + v.age * 1.6;
      X.fillStyle = spc(i);
      X.globalAlpha = a * 0.8;
      X.beginPath();
      X.arc(v.cx + Math.cos(ang) * r, v.cy + Math.sin(ang) * r, 2, 0, Math.PI * 2);
      X.fill();
    }
    X.globalAlpha = 1;
  },

  prism_ray(v, X) {
    const s = v.spell;
    const a = v.state === 0 ? 1 : Math.max(0, 1 - v.age / 14);
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.lineCap = 'round';
    const dx = v.x2 - v.x1, dy = v.y2 - v.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    // Sete sub-feixes coloridos, ligeiramente separados (dispersão prismática).
    for (let i = 0; i < 7; i++) {
      const off = (i - 3) * (s.rayW / 7) * (0.5 + Math.sin(v.age * 0.2 + i) * 0.3);
      X.strokeStyle = spc(i);
      X.globalAlpha = a * 0.55;
      X.lineWidth = 2.4;
      X.beginPath();
      X.moveTo(v.x1 + nx * off, v.y1 + ny * off);
      X.lineTo(v.x2 + nx * off, v.y2 + ny * off);
      X.stroke();
    }
    // Núcleo branco
    X.strokeStyle = PRISM.core;
    X.globalAlpha = a * 0.9;
    X.lineWidth = 3;
    X.beginPath(); X.moveTo(v.x1, v.y1); X.lineTo(v.x2, v.y2); X.stroke();
    X.restore();
    X.globalAlpha = 1;
  },

  prism_iris_nova(v, X) {
    const s = v.spell;
    const t = Math.min(1, v.age / 22);
    const r = s.novaR * t;
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const rad = r - i * 4;
      if (rad < 0.5) continue; // raio negativo quebra X.arc nos primeiros frames
      X.strokeStyle = spc(i);
      X.globalAlpha = (1 - t) * 0.7;
      X.lineWidth = 3;
      X.beginPath();
      X.arc(v.cx, v.cy, rad, 0, Math.PI * 2);
      X.stroke();
    }
    X.restore();
    glow(X, v.cx, v.cy, Math.max(0, r * 0.8), PRISM.core, (1 - t) * 0.5);
    X.globalAlpha = 1;
  },

  prism_sentinel(v, X) {
    const b = v.ally;
    if (!b || !b.active) return;
    const bx = b.x + b.w / 2, by = b.y + b.h / 2;
    const rot = v.age * 0.05;
    glow(X, bx, by, 22, spc(v.age * 0.08 | 0), 0.5);
    X.save();
    X.translate(bx, by);
    X.rotate(rot);
    // Octaedro de cristal (dois triângulos espelhados).
    X.fillStyle = PRISM.core;
    X.globalAlpha = 0.9;
    X.beginPath(); X.moveTo(0, -9); X.lineTo(7, 0); X.lineTo(-7, 0); X.closePath(); X.fill();
    X.beginPath(); X.moveTo(0, 9); X.lineTo(7, 0); X.lineTo(-7, 0); X.closePath(); X.fill();
    // Facetas espectrais
    X.globalAlpha = 0.85;
    X.strokeStyle = spc(v.age * 0.1 | 0);
    X.lineWidth = 1.3;
    X.beginPath(); X.moveTo(0, -9); X.lineTo(0, 9); X.moveTo(-7, 0); X.lineTo(7, 0); X.stroke();
    X.restore();
    X.globalAlpha = 1;
    drawAllyHp(X, b);
  },

  prism_mosaic(v, X) {
    const s = v.spell;
    const a = Math.max(0.2, 1 - v.age / s.mosaicDur);
    const sway = Math.sin(v.age * 0.04) * 0.05;
    glow(X, v.cx, v.cy, s.mosaicW * 0.7, PRISM.core, a * 0.3);
    drawVitral(X, v.cx, v.cy, s.mosaicW, s.mosaicH, sway, a, v.age, 4, 4);
  },

  prism_coruscate(v, X) {
    const t = Math.min(1, v.age / 6);
    const fade = Math.max(0, 1 - (v.age - 6) / 14);
    // Clarão branco que cobre uma área ampla.
    X.save();
    X.globalCompositeOperation = 'lighter';
    glow(X, v.cx, v.cy, v.spell.flashR * (0.6 + t), PRISM.core, fade * 0.85);
    // Raios espectrais saindo do clarão
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      X.strokeStyle = spc(i);
      X.globalAlpha = fade * 0.6;
      X.lineWidth = 2;
      X.beginPath();
      X.moveTo(v.cx, v.cy);
      X.lineTo(v.cx + Math.cos(ang) * v.spell.flashR * t, v.cy + Math.sin(ang) * v.spell.flashR * t);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  prism_lightstride(v, X) {
    if (v.state > 1) return;
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      X.strokeStyle = spc(i);
      X.globalAlpha = 0.4;
      X.lineWidth = 2;
      const off = (i - 3) * 2;
      X.beginPath();
      X.moveTo(v.fx, v.fy + off);
      X.lineTo(v.tx, v.ty + off);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  prism_rose_ward(v, X) {
    const s = v.spell;
    if (v.state !== 0) return;
    const a = Math.max(0.3, 1 - v.age / s.wardDur);
    const r = 40 + Math.sin(v.age * 0.08) * 4;
    drawRose(X, v.cx, v.cy, r, 8, a, v.age);
    glow(X, v.cx, v.cy, r * 1.4, PRISM.core, a * 0.2);
  },

  prism_cathedral(v, X) {
    const s = v.spell;
    X.save();
    // Tonalização do palco: clareia como nave de catedral iluminada.
    let lightA = 0;
    if (v.state === 0) lightA = Math.min(0.28, v.age / 54 * 0.28);
    else if (v.state === 1) lightA = 0.28;
    else lightA = Math.max(0, 0.28 - v.age / 42 * 0.28);
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = PRISM.glass;
    X.globalAlpha = lightA;
    X.fillRect(0, 0, state.W, state.H);
    X.globalCompositeOperation = 'source-over';
    X.globalAlpha = 1;

    // Colunas de vitral em arco ao redor do player (a "catedral").
    const grow = v.state === 0 ? v.age / 54 : 1;
    const ringR = v.state === 0 ? 70 + v.age * 3 : 200 + Math.sin(v.age * 0.06) * 12;
    const R = Math.min(ringR, 240);
    const cols = 8;
    for (let i = 0; i < cols; i++) {
      const ang = (i / cols) * Math.PI * 2 + v.age * 0.004;
      const px = v.cx + Math.cos(ang) * R;
      const py = v.cy + Math.sin(ang) * R * 0.55; // perspectiva achatada
      drawVitral(X, px, py, 26 * grow, 64 * grow, 0, 0.5 * (v.state === 2 ? Math.max(0, 1 - v.age / 42) : 1), v.age + i * 10, 2, 5);
    }
    // Rosácea colossal centrada.
    drawRose(X, v.cx, v.cy, R * 0.6, 12, v.state === 2 ? Math.max(0, 0.6 - v.age / 42 * 0.6) : 0.5, v.age);
    if (v.state === 2 && v.age < 8) {
      // Flash de implosão.
      X.globalCompositeOperation = 'lighter';
      X.fillStyle = PRISM.core;
      X.globalAlpha = Math.max(0, 0.8 - v.age / 8 * 0.8);
      X.fillRect(0, 0, state.W, state.H);
    }
    X.restore();
    X.globalAlpha = 1;
  },
};

// Barra de HP de aliado (prisma sentinela). Espelha o helper de elemental.js.
function drawAllyHp(X, b) {
  if (!b || !b.maxHp) return;
  const w = 16, x = b.x + b.w / 2 - w / 2, y = b.y - 6;
  X.save();
  X.globalAlpha = 0.85;
  X.fillStyle = '#1a1020';
  X.fillRect(x, y, w, 2);
  X.fillStyle = PRISM.cyan;
  X.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 2);
  X.restore();
  X.globalAlpha = 1;
}
