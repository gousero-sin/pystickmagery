// aracnidea.js — Escola de Magia Aracnidea
//   Transmutação aracnídea: teias, veneno, casulos, emboscada e predatismo.
//   Ao selecioná-la o player vira humano-aranha (sprite transmorfo em
//   arcane-modular.html → drawStickman).
import { state } from '../core/state.js?v=7';
import { spawnP, hurtEntity, normAngle, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { createAlly } from '../core/allies.js?v=1';
import { SoundFX } from '../core/sounds.js?v=7';

const ARAC = {
  color: '#8f3dff',
  c2: '#d8b4ff',
  core: '#fff3ff',
  venom: '#9cff57',
  silk: '#e9ddff',
  shadow: '#14081f',
  blood: '#bb1f5c',
};

// Zonas de Looming Web ativas — Silk Fang ganha bônus ao atravessá-las.
const LOOMING_WEBS = [];

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

// Dano em área que atinge apenas inimigos (não fere o player nem props).
function venomBlast(x, y, r, dmg, force = 0) {
  for (const e of enemiesInRadius(x, y, r)) {
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    const d = Math.hypot(ex - x, ey - y) || 1;
    const pct = 1 - d / r;
    hurtEntity(e, Math.max(1, Math.floor(dmg * pct)), x, y);
    if (force) {
      e.vx += (ex - x) / d * force * pct / (e.mass || 1);
      e.vy += (ey - y) / d * force * pct / (e.mass || 1) - 1.5;
    }
  }
}

function snareEntity(e, frames) {
  if (!e) return;
  state.frozenEntities.set(e, Math.max(state.frozenEntities.get(e) || 0, frames));
}

// Distância de um ponto a um segmento (usado pelo bônus de Looming Web).
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
function silkThread(X, x1, y1, x2, y2, color, alpha, sag = 0) {
  X.strokeStyle = color;
  X.globalAlpha = alpha;
  X.lineWidth = 1;
  X.beginPath();
  X.moveTo(x1, y1);
  if (sag) X.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2);
  else X.lineTo(x2, y2);
  X.stroke();
  X.globalAlpha = 1;
}

// Desenha uma teia radial/mandala em (cx,cy) — base visual de várias magias.
function drawWebMandala(X, cx, cy, r, spokes, rings, color, alpha, rot = 0) {
  X.save();
  X.translate(cx, cy);
  X.rotate(rot);
  X.strokeStyle = color;
  X.globalAlpha = alpha;
  X.lineWidth = 1;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    X.beginPath();
    X.moveTo(0, 0);
    X.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    X.stroke();
  }
  for (let k = 1; k <= rings; k++) {
    const rr = (r * k) / rings;
    X.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) X.moveTo(px, py);
      else X.lineTo(px, py);
    }
    X.stroke();
  }
  X.restore();
  X.globalAlpha = 1;
}
// Perna aracnídea segmentada (joelho anguloso) com brilho de ponta.
function drawSpiderLeg(X, x, y, ang, lenA, lenB, color, pulse, width = 2) {
  const jx = x + Math.cos(ang) * lenA;
  const jy = y + Math.sin(ang) * lenA;
  const tx = jx + Math.cos(ang + pulse) * lenB;
  const ty = jy + Math.sin(ang + pulse) * lenB;
  X.strokeStyle = color;
  X.lineWidth = width;
  X.lineCap = 'round';
  X.lineJoin = 'round';
  X.beginPath();
  X.moveTo(x, y);
  X.lineTo(jx, jy);
  X.lineTo(tx, ty);
  X.stroke();
  return { tx, ty };
}

// ── Spell Definitions ─────────────────────────────────────────────────────────
export const SPELL_DEFS = [
  {
    name: 'Silk Fang', icon: '🦷', key: '1', category: 'Common',
    color: ARAC.color, c2: ARAC.silk, core: ARAC.core,
    speed: 13, dmg: 9, mana: 8, cd: 280, r: 3, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_fang', isSilkFang: true,
    desc: 'Presa de seda comprimida que estoura fios venenosos no impacto.',
  },
  {
    name: 'Web Snare', icon: '🕸️', key: '2', category: 'Bind',
    color: ARAC.c2, c2: ARAC.silk, core: ARAC.core,
    speed: 9, dmg: 5, mana: 18, cd: 1100, r: 5, grav: 0.02, drag: 0.99, bounce: 0,
    trail: 'aracnidea_silk', isWebSnare: true, snareDur: 150,
    desc: 'Rede que prende o primeiro inimigo, travando-o e drenando vida.',
  },
  {
    name: 'Venom Bloom', icon: '☣️', key: '3', category: 'Trap',
    color: ARAC.venom, c2: '#5fcf3a', core: '#eaffd6',
    speed: 0, dmg: 3, mana: 24, cd: 1600, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_venom', isVenomBloom: true, bloomR: 72, bloomDur: 220,
    desc: 'Flor de veneno que pulsa no chão e envenena inimigos próximos.',
  },
  {
    name: 'Threadstep', icon: '➰', key: '4', category: 'Dash',
    color: ARAC.color, c2: ARAC.c2, core: ARAC.silk,
    speed: 0, dmg: 0, mana: 22, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_silk', isThreadstep: true, stepRange: 185, stepWind: 7, stepTravel: 7, stepPush: 6,
    desc: 'Dissolve-se em fios e reaparece junto ao alvo, repelindo quem estiver perto.',
  },
  {
    name: 'Broodlings', icon: '🕷️', key: '5', category: 'Summon',
    color: ARAC.color, c2: ARAC.venom, core: ARAC.silk,
    speed: 0, dmg: 6, mana: 35, cd: 2600, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_silk', isBroodlings: true, broodCount: 3, broodDur: 360,
    desc: 'Três aranhas de seda caçam inimigos e explodem em veneno.',
  },
  {
    name: 'Cocoon Ward', icon: '🥚', key: '6', category: 'Ward',
    color: ARAC.silk, c2: ARAC.c2, core: ARAC.core,
    speed: 0, dmg: 8, mana: 38, cd: 5200, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_silk', isCocoonWard: true, wardDur: 200, wardR: 84,
    desc: 'Casulo de seda absorve dano e estoura em fios ao terminar.',
  },
  {
    name: 'Ceiling Hunger', icon: '🪤', key: '7', category: 'Cast',
    color: ARAC.color, c2: ARAC.blood, core: ARAC.core,
    speed: 0, dmg: 24, mana: 32, cd: 2400, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_silk', isCeilingHunger: true, hungerR: 56,
    desc: 'Abre uma fenda de teia e uma aranha espectral despenca sobre o alvo.',
  },
  {
    name: 'Looming Web', icon: '🪢', key: '8', category: 'Structure',
    color: ARAC.c2, c2: ARAC.silk, core: ARAC.core,
    speed: 0, dmg: 0, mana: 30, cd: 2800, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_silk', isLoomingWeb: true, webDur: 420, webR: 74,
    desc: 'Tece uma teia territorial que lentifica inimigos e amplia Silk Fang.',
  },
  {
    name: 'Eightfold Riposte', icon: '✴️', key: '9', category: 'Riposte',
    color: ARAC.color, c2: ARAC.c2, core: ARAC.core,
    speed: 12, dmg: 6, mana: 34, cd: 3600, r: 4, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_fang', isEightfoldRiposte: true, riposteWind: 26,
    desc: 'Postura de aranha: ao ser ameaçado dispara oito lâminas de seda em arco.',
  },
  {
    name: 'Matriarch Eclipse', icon: '🌘', key: '0', category: 'Ultimate',
    color: ARAC.color, c2: ARAC.blood, core: ARAC.core,
    speed: 0, dmg: 18, mana: 90, cd: 12000, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'aracnidea_silk', isMatriarchEclipse: true,
    desc: 'Torna-se a Matriarca Aracnídea: a arena escurece e presas espectrais caem (Ultimate).',
  },
];

// ── FIRE_HANDLERS ──────────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  isVenomBloom(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'aracnidea_venom_bloom', state: 0, age: 0, cx: tx, cy: ty, spell: s });
    SoundFX.playNoise(0.18, 0.3, 240, 'lowpass');
    return true;
  },
  isThreadstep(s, ox, oy, tx, ty) {
    const p = state.player;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    const dx = tx - px, dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.min(s.stepRange, len);
    const nx = Math.max(20, Math.min(state.W - 20, px + dx / len * dist));
    const ny = Math.max(28, Math.min(state.H - 30, py + dy / len * dist));
    state.vfxSequences.push({ type: 'aracnidea_threadstep', state: 0, age: 0, fx: px, fy: py, tx: nx, ty: ny, spell: s });
    SoundFX.playSweep(520, 180, 'sine', 0.4, 0.3);
    return true;
  },
  isBroodlings(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'aracnidea_broodlings', state: 0, age: 0, cx: ox, cy: oy, spell: s, brood: [] });
    SoundFX.playTone(360, 'square', 0.16, 0.18);
    return true;
  },
  isCocoonWard(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({ type: 'aracnidea_cocoon_ward', state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s, prevInv: !!p.inv });
    p.inv = true;
    SoundFX.playSweep(300, 600, 'sine', 0.3, 0.3);
    return true;
  },
  isCeilingHunger(s, ox, oy, tx, ty) {
    const tgt = nearestEnemyEntity(tx, ty, 260);
    const cx = tgt ? tgt.x + tgt.w / 2 : tx;
    const cy = tgt ? tgt.y + tgt.h / 2 : ty;
    state.vfxSequences.push({ type: 'aracnidea_ceiling_hunger', state: 0, age: 0, cx, cy, target: tgt, spell: s });
    SoundFX.playSweep(700, 300, 'triangle', 0.3, 0.25);
    return true;
  },
  isLoomingWeb(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'aracnidea_looming_web', state: 0, age: 0, x1: ox, y1: oy, x2: tx, y2: ty, spell: s, zone: null });
    SoundFX.playNoise(0.2, 0.4, 300, 'bandpass', 4);
    return true;
  },
  isEightfoldRiposte(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({ type: 'aracnidea_eightfold_riposte', state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s, fired: false });
    p.castAnim = 280; p.castType = 'front_pose';
    SoundFX.playTone(440, 'sawtooth', 0.14, 0.2);
    return true;
  },
  isMatriarchEclipse(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({ type: 'aracnidea_matriarch_eclipse', state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s, prevInv: !!p.inv, impacts: 0 });
    p.inv = true;
    p.aracnideaUlt = true;
    SoundFX.playSweep(160, 60, 'sine', 0.6, 0.6);
    return true;
  },
};

// ── PROJ_HOOKS ──────────────────────────────────────────────────────────────────
export const PROJ_HOOKS = {
  // Web Snare resolve antes do hook de trail (flag tem prioridade).
  isWebSnare: {
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && isEnemyEntity(hitEntity)) {
        snareEntity(hitEntity, s.snareDur);
        state.vfxSequences.push({ type: 'aracnidea_web_snare', state: 0, age: 0, target: hitEntity, cx: hitEntity.x + hitEntity.w / 2, cy: hitEntity.y + hitEntity.h / 2, spell: s });
        SoundFX.playNoise(0.16, 0.25, 260, 'bandpass', 3);
        return true;
      }
      spawnP(p.x, p.y, s.c2, 8, 'sparkle');
      return false;
    },
  },
  // Silk Fang e lâminas do Eightfold compartilham o trail de presa.
  aracnidea_fang: {
    onUpdate(p, s) {
      if (!s.isSilkFang || !LOOMING_WEBS.length) return false;
      if (p._webBoosted) return false;
      for (const z of LOOMING_WEBS) {
        if (distToSegment(p.x, p.y, z.x1, z.y1, z.x2, z.y2) < z.r) {
          p._webBoosted = true;
          p.growDmg = (p.growDmg || s.dmg) * 1.25;
          p.growR = (p.growR || s.r) + 1.5;
          spawnP(p.x, p.y, ARAC.venom, 5, 'sparkle');
          break;
        }
      }
      return false;
    },
    onLand(p, s, hitPlat, hitEntity) {
      spawnP(p.x, p.y, ARAC.silk, 5, 'trail');
      spawnP(p.x, p.y, ARAC.venom, 6, 'sparkle');
      if (hitEntity && isEnemyEntity(hitEntity)) {
        if (s.isSilkFang) {
          state.vfxSequences.push({ type: 'aracnidea_mini_web', state: 0, age: 0, cx: hitEntity.x + hitEntity.w / 2, cy: hitEntity.y + hitEntity.h / 2, spell: s });
        }
        return true;
      }
      return false;
    },
  },
};

// ── TRAIL_EMITTERS ─────────────────────────────────────────────────────────────
export const TRAIL_EMITTERS = {
  aracnidea_silk(p, s) {
    spawnP(p.x, p.y, Math.random() > 0.5 ? ARAC.silk : ARAC.c2, 1, 'trail');
  },
  aracnidea_venom(p, s) {
    spawnP(p.x, p.y, Math.random() > 0.5 ? ARAC.venom : '#6fd83a', 1, 'trail');
  },
  aracnidea_fang(p, s) {
    spawnP(p.x, p.y, ARAC.silk, 1, 'trail');
    if (p.age % 4 === 0) spawnP(p.x, p.y, ARAC.venom, 1, 'sparkle');
  },
};

// ── VFX_UPDATE ──────────────────────────────────────────────────────────────────
export const VFX_UPDATE = {
  aracnidea_mini_web(v) {
    if (v.age === 1) spawnP(v.cx, v.cy, ARAC.silk, 6, 'sparkle');
    if (v.age > 26) rmVfx(v);
  },

  aracnidea_web_snare(v) {
    const s = v.spell, e = v.target;
    if (!e || !e.active || e.hp <= 0) { rmVfx(v); return; }
    v.cx = e.x + e.w / 2;
    v.cy = e.y + e.h / 2;
    snareEntity(e, 6); // mantém preso enquanto a VFX vive
    if (v.age % 22 === 0) {
      hurtEntity(e, Math.max(1, s.dmg), v.cx, v.cy);
      spawnP(v.cx, v.cy, ARAC.venom, 3, 'sparkle');
    }
    if (v.age > s.snareDur) rmVfx(v);
  },

  aracnidea_venom_bloom(v) {
    const s = v.spell;
    if (v.age === 1) { spawnP(v.cx, v.cy, s.color, 12, 'burst'); state.shake(3); }
    if (v.age % 14 === 0) {
      for (const e of enemiesInRadius(v.cx, v.cy, s.bloomR)) {
        hurtEntity(e, s.dmg, v.cx, v.cy);
        e.vx *= 0.9;
      }
    }
    if (v.age % 3 === 0) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * s.bloomR;
      state.particles.push({ x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r, vx: 0, vy: -0.6 - Math.random(), life: 30, ml: 30, color: Math.random() > 0.5 ? s.color : s.c2, size: 2, grav: -0.02, type: 'smoke' });
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.bloomR * 0.9, color: s.color, int: 0.5, life: 2, ml: 2 });
    if (v.age > s.bloomDur) { spawnP(v.cx, v.cy, s.c2, 8, 'burst'); rmVfx(v); }
  },

  aracnidea_threadstep(v) {
    const s = v.spell, p = state.player;
    if (v.state === 0) {
      p.inv = true; p.vx *= 0.4; p.vy *= 0.4;
      if (v.age === 1) spawnP(v.fx, v.fy, s.c2, 14, 'void');
      if (v.age % 2 === 0) spawnP(v.fx + (Math.random() - 0.5) * 20, v.fy + (Math.random() - 0.5) * 28, s.color, 1, 'void');
      if (v.age >= s.stepWind) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) {
      const t = Math.min(1, v.age / s.stepTravel);
      const ease = t * t * (3 - 2 * t);
      p.x = v.fx + (v.tx - v.fx) * ease - p.w / 2;
      p.y = v.fy + (v.ty - v.fy) * ease - p.h / 2;
      p.vx = 0; p.vy = 0;
      spawnP(p.x + p.w / 2, p.y + p.h / 2, s.c2, 2, 'void');
      state.dynamicLights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 60, color: s.color, int: 1.2, life: 2, ml: 2 });
      if (v.age >= s.stepTravel) {
        v.state = 2; v.age = 0;
        // Onda de choque puramente de controle: repele inimigos, sem dano (Dash).
        const sx = p.x + p.w / 2, sy = p.y + p.h / 2;
        for (const e of enemiesInRadius(sx, sy, 64)) {
          const a = Math.atan2(e.y + e.h / 2 - sy, e.x + e.w / 2 - sx);
          e.vx += Math.cos(a) * s.stepPush;
          e.vy += Math.sin(a) * s.stepPush - 2;
        }
        state.shockwaves.push({ x: sx, y: sy, r: 0, maxR: 64, life: 12, maxLife: 12, color: s.c2 });
        state.shake(6);
        spawnP(p.x + p.w / 2, p.y + p.h / 2, s.core, 16, 'burst');
        SoundFX.playSweep(260, 700, 'sine', 0.35, 0.2);
      }
    } else {
      p.inv = false;
      if (v.age > 8) rmVfx(v);
    }
  },

  aracnidea_broodlings(v) {
    const s = v.spell;
    if (v.state === 0) {
      for (let i = 0; i < s.broodCount; i++) {
        const off = (i - (s.broodCount - 1) / 2) * 18;
        const b = createAlly({ x: v.cx + off - 6, y: v.cy - 6, w: 12, h: 12, mana: Math.round(s.mana / s.broodCount), threat: 22, type: 'ally-aracnidea-brood', color: s.color, c2: s.c2 });
        state.entities.push(b);
        v.brood.push({ ally: b, walk: Math.random() * 6 });
      }
      state.shake(2);
      v.state = 1; v.age = 0;
      return;
    }
    let alive = 0;
    for (const u of v.brood) {
      const b = u.ally;
      if (!b || !b.active || b.hp <= 0) continue;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      const tgt = nearestEnemyEntity(bx, by, 260);
      if (tgt) {
        const ex = tgt.x + tgt.w / 2, ey = tgt.y + tgt.h / 2;
        const a = Math.atan2(ey - by, ex - bx);
        b.vx = Math.cos(a) * 3.4;
        b.vy = Math.sin(a) * 3.4;
        b.x += b.vx; b.y += b.vy;
        u.walk += 0.4;
        if (Math.hypot(ex - bx, ey - by) < 18) {
          venomBlast(bx, by, 40, s.dmg, 3);
          for (const e of enemiesInRadius(bx, by, 40)) e.vx *= 0.7;
          spawnP(bx, by, s.c2, 12, 'burst');
          spawnP(bx, by, ARAC.venom, 8, 'sparkle');
          state.shake(2);
          b.active = false;
          continue;
        }
      } else {
        b.vy += 0.4; b.x += b.vx; b.y += b.vy; b.vx *= 0.9;
      }
      if (Math.random() < 0.3) spawnP(bx, by, s.silk || ARAC.silk, 1, 'trail');
      alive++;
    }
    if (alive === 0 || v.age > s.broodDur) {
      for (const u of v.brood) if (u.ally) u.ally.active = false;
      rmVfx(v);
    }
  },

  aracnidea_cocoon_ward(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x + p.w / 2;
    v.cy = p.y + p.h / 2;
    if (v.state === 0) {
      p.inv = true;
      if (v.age % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        spawnP(v.cx + Math.cos(a) * 22, v.cy + Math.sin(a) * 26, ARAC.silk, 1, 'trail');
      }
      if (v.age > s.wardDur) {
        v.state = 1; v.age = 0;
        p.inv = v.prevInv;
        venomBlast(v.cx, v.cy, s.wardR, s.dmg, 7);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.wardR, life: 14, maxLife: 14, color: ARAC.silk });
        state.shake(7);
        spawnP(v.cx, v.cy, ARAC.silk, 22, 'burst');
        spawnP(v.cx, v.cy, s.c2, 14, 'sparkle');
        SoundFX.playNoise(0.4, 0.3, 320, 'lowpass');
      }
    } else {
      if (v.age > 12) rmVfx(v);
    }
  },

  aracnidea_ceiling_hunger(v) {
    const s = v.spell;
    if (v.target && v.target.active) { v.cx = v.target.x + v.target.w / 2; v.cy = v.target.y + v.target.h / 2; }
    if (v.state === 0) { // antecipação: fenda de teia acima
      if (v.age === 1) SoundFX.playTone(520, 'triangle', 0.2, 0.2);
      if (v.age % 3 === 0) spawnP(v.cx + (Math.random() - 0.5) * 40, v.cy - 90 + Math.random() * 20, s.color, 1, 'void');
      if (v.age > 26) { v.state = 1; v.age = 0; state.shake(3); }
    } else if (v.state === 1) { // queda da aranha espectral
      if (v.age >= 8) {
        v.state = 2; v.age = 0;
        venomBlast(v.cx, v.cy, s.hungerR, s.dmg, 8);
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.hungerR, life: 12, maxLife: 12, color: s.c2 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 130, color: s.color, int: 2.5, life: 10, ml: 10 });
        state.shake(11);
        spawnP(v.cx, v.cy, s.core, 24, 'explode');
        spawnP(v.cx, v.cy, ARAC.venom, 12, 'sparkle');
        SoundFX.playNoise(0.5, 0.3, 200, 'lowpass');
      }
    } else {
      if (v.age > 16) rmVfx(v);
    }
  },

  aracnidea_looming_web(v) {
    const s = v.spell;
    if (v.state === 0) {
      v.state = 1; v.age = 0;
      const cx = (v.x1 + v.x2) / 2, cy = (v.y1 + v.y2) / 2;
      v.zone = { x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2, r: s.webR, cx, cy };
      LOOMING_WEBS.push(v.zone);
      state.shake(3);
      spawnP(cx, cy, s.c2, 14, 'burst');
      return;
    }
    // Lentifica inimigos dentro da teia.
    if (v.age % 4 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (distToSegment(e.x + e.w / 2, e.y + e.h / 2, v.zone.x1, v.zone.y1, v.zone.x2, v.zone.y2) < s.webR) {
          e.vx *= 0.55;
          e.vy *= 0.8;
          if (Math.random() < 0.2) spawnP(e.x + e.w / 2, e.y + e.h / 2, ARAC.silk, 1, 'trail');
        }
      }
    }
    if (v.age > s.webDur) {
      const i = LOOMING_WEBS.indexOf(v.zone);
      if (i !== -1) LOOMING_WEBS.splice(i, 1);
      spawnP(v.zone.cx, v.zone.cy, s.c2, 10, 'burst');
      rmVfx(v);
    }
  },

  aracnidea_eightfold_riposte(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x + p.w / 2;
    v.cy = p.y + p.h / 2;
    if (v.state === 0) {
      if (v.age >= s.riposteWind && !v.fired) {
        v.fired = true;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          state.projectiles.push(createPlayerProjectile({
            x: v.cx, y: v.cy,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            spell: s, life: 70, trail: [], hitList: [], growR: s.r, growDmg: s.dmg,
          }));
        }
        state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 50, life: 10, maxLife: 10, color: s.c2 });
        state.shake(5);
        spawnP(v.cx, v.cy, s.core, 16, 'burst');
        SoundFX.playSweep(700, 1200, 'sawtooth', 0.3, 0.2);
        v.state = 1; v.age = 0;
      }
    } else {
      if (v.age > 14) rmVfx(v);
    }
  },

  aracnidea_matriarch_eclipse(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x + p.w / 2;
    v.cy = p.y + p.h / 2;
    p.vx *= 0.6;
    if (v.state === 0) { // transformação + escurecimento
      p.inv = true;
      if (v.age === 1) { state.shake(8); SoundFX.playNoise(0.6, 0.6, 160, 'lowpass'); }
      state.shake(Math.min(v.age / 12, 5));
      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 80;
        state.particles.push({ x: v.cx + Math.cos(a) * d, y: v.cy + Math.sin(a) * d, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 3, life: 26, ml: 26, color: s.color, size: 2, grav: 0, type: 'void' });
      }
      if (v.age > 50) { v.state = 1; v.age = 0; }
    } else if (v.state === 1) { // presas espectrais sequenciais
      // Puxa inimigos levemente para o centro (linhas de teia).
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const a = Math.atan2(v.cy - (e.y + e.h / 2), v.cx - (e.x + e.w / 2));
        e.vx += Math.cos(a) * 0.25;
        e.vy += Math.sin(a) * 0.18;
      }
      if (v.age % 14 === 0 && v.impacts < 8) {
        v.impacts++;
        const tgt = nearestEnemyEntity(v.cx + (Math.random() - 0.5) * 200, v.cy + (Math.random() - 0.5) * 120, 320);
        const ix = tgt ? tgt.x + tgt.w / 2 : v.cx + (Math.random() - 0.5) * 220;
        const iy = tgt ? tgt.y + tgt.h / 2 : v.cy + (Math.random() - 0.5) * 100;
        venomBlast(ix, iy, 58, s.dmg, 6);
        state.shockwaves.push({ x: ix, y: iy, r: 0, maxR: 58, life: 10, maxLife: 10, color: s.c2 });
        state.dynamicLights.push({ x: ix, y: iy, r: 110, color: s.color, int: 2, life: 8, ml: 8 });
        state.shake(7);
        spawnP(ix, iy, s.core, 16, 'explode');
        spawnP(ix, iy, ARAC.venom, 8, 'sparkle');
        SoundFX.playNoise(0.3, 0.2, 220, 'lowpass');
      }
      if (v.impacts >= 8 || v.age > 130) { v.state = 2; v.age = 0; }
    } else { // finale: explosão de seda e veneno
      if (v.age === 1) {
        p.inv = v.prevInv;
        p.aracnideaUlt = false;
        venomBlast(v.cx, v.cy, 180, s.dmg * 1.6, 12);
        for (let k = 0; k < 6; k++) state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: 120 + k * 30, life: 14 + k * 3, maxLife: 14 + k * 3, color: k % 2 ? s.core : s.c2 });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 320, color: s.core, int: 4, life: 12, ml: 12 });
        state.shake(26);
        spawnP(v.cx, v.cy, s.core, 40, 'explode');
        spawnP(v.cx, v.cy, ARAC.venom, 24, 'burst');
        SoundFX.playSweep(400, 120, 'sawtooth', 0.6, 0.5);
      }
      if (v.age > 40) {
        p.aracnideaUlt = false;
        rmVfx(v);
      }
    }
  },
};

// ── VFX_DRAW ────────────────────────────────────────────────────────────────────
export const VFX_DRAW = {
  aracnidea_mini_web(v, X) {
    const a = Math.max(0, 1 - v.age / 26);
    drawWebMandala(X, v.cx, v.cy, 16, 6, 2, ARAC.silk, a * 0.8, v.age * 0.04);
  },

  aracnidea_web_snare(v, X) {
    const e = v.target;
    if (!e) return;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    X.save();
    X.lineCap = 'round';
    // Fios ancorando o inimigo a pontos fixos no ar/chão.
    const anchors = [[cx - 40, cy - 34], [cx + 40, cy - 34], [cx - 34, cy + 30], [cx + 34, cy + 30]];
    for (const [ax, ay] of anchors) silkThread(X, ax, ay, cx, cy, ARAC.silk, 0.55, 4);
    drawWebMandala(X, cx, cy, 20, 8, 3, ARAC.c2, 0.6, v.age * 0.02);
    X.restore();
  },

  aracnidea_venom_bloom(v, X) {
    const s = v.spell;
    const pulse = 0.6 + Math.sin(v.age * 0.18) * 0.4;
    X.save();
    X.globalCompositeOperation = 'lighter';
    const grad = X.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, s.bloomR);
    grad.addColorStop(0, s.core);
    grad.addColorStop(0.4, s.color);
    grad.addColorStop(1, 'transparent');
    X.globalAlpha = 0.3 * pulse * Math.max(0.2, 1 - v.age / s.bloomDur);
    X.fillStyle = grad;
    X.beginPath();
    X.arc(v.cx, v.cy, s.bloomR * (0.7 + pulse * 0.3), 0, Math.PI * 2);
    X.fill();
    X.restore();
    // Bolsa de veneno pulsante no centro.
    X.fillStyle = s.color;
    X.globalAlpha = 0.8;
    X.beginPath();
    X.arc(v.cx, v.cy, 8 + pulse * 4, 0, Math.PI * 2);
    X.fill();
    X.globalAlpha = 1;
  },

  aracnidea_threadstep(v, X) {
    const s = v.spell;
    X.save();
    X.globalCompositeOperation = 'lighter';
    if (v.state <= 1) {
      X.strokeStyle = s.c2;
      X.lineWidth = 3;
      X.globalAlpha = 0.6;
      X.beginPath();
      X.moveTo(v.fx, v.fy);
      X.lineTo(v.tx, v.ty);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  aracnidea_broodlings(v, X) {
    const s = v.spell;
    for (const u of v.brood) {
      const b = u.ally;
      if (!b || !b.active) continue;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      X.save();
      X.translate(bx, by);
      // Corpo
      X.fillStyle = s.color;
      X.beginPath();
      X.arc(0, 0, 4, 0, Math.PI * 2);
      X.fill();
      X.fillStyle = s.c2;
      X.fillRect(-1, -1, 2, 2);
      // 4 perninhas animadas
      const pulse = Math.sin(u.walk) * 0.4;
      for (let i = 0; i < 4; i++) {
        const side = i < 2 ? -1 : 1;
        const a = side * (0.6 + (i % 2) * 0.5);
        drawSpiderLeg(X, side * 2, 0, a, 4, 4, s.c2, pulse * side, 1);
      }
      X.restore();
    }
  },

  aracnidea_cocoon_ward(v, X) {
    const s = v.spell;
    if (v.state !== 0) return;
    const wob = Math.sin(v.age * 0.2) * 2;
    X.save();
    X.translate(v.cx, v.cy);
    // Casulo translúcido
    X.fillStyle = ARAC.silk;
    X.globalAlpha = 0.22;
    X.beginPath();
    X.ellipse(0, 0, 16 + wob, 26, 0, 0, Math.PI * 2);
    X.fill();
    // Fios envolventes
    X.strokeStyle = s.c2;
    X.globalAlpha = 0.65;
    X.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const yy = -24 + i * 7;
      X.beginPath();
      X.moveTo(-15, yy);
      X.quadraticCurveTo(0, yy + (i % 2 ? 4 : -4) + wob, 15, yy);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  aracnidea_ceiling_hunger(v, X) {
    const s = v.spell;
    X.save();
    if (v.state === 0) {
      // Fenda de teia acima do alvo
      const prog = Math.min(1, v.age / 26);
      drawWebMandala(X, v.cx, v.cy - 80, 18 + prog * 18, 8, 3, s.color, 0.5 + prog * 0.3, v.age * 0.05);
      silkThread(X, v.cx, v.cy - 80, v.cx, v.cy, s.c2, 0.3 * prog, 0);
    } else if (v.state === 1) {
      // Pernas gigantes fechando sobre o alvo
      const close = v.age / 8;
      X.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const side = i < 2 ? -1 : 1;
        const baseA = side * (1.1 + (i % 2) * 0.4);
        const ox = side * 46 * (1 - close);
        drawSpiderLeg(X, v.cx + ox, v.cy - 70 * (1 - close), baseA + Math.PI / 2, 36, 34, s.c2, -close * 0.6, 3);
      }
      X.globalAlpha = 0.5;
      X.fillStyle = s.color;
      X.beginPath();
      X.arc(v.cx, v.cy - 40 * (1 - close), 10, 0, Math.PI * 2);
      X.fill();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  aracnidea_looming_web(v, X) {
    const s = v.spell;
    if (!v.zone) return;
    const z = v.zone;
    const a = Math.max(0.15, 1 - v.age / s.webDur);
    X.save();
    X.strokeStyle = s.c2;
    X.globalAlpha = a * 0.6;
    X.lineWidth = 1;
    // Eixo principal da teia
    X.beginPath();
    X.moveTo(z.x1, z.y1);
    X.lineTo(z.x2, z.y2);
    X.stroke();
    // Fios transversais ondulados
    const dx = z.x2 - z.x1, dy = z.y2 - z.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const segs = Math.max(4, Math.floor(len / 22));
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = z.x1 + dx * t, my = z.y1 + dy * t;
      const spread = z.r * (0.5 + Math.sin(t * Math.PI) * 0.5);
      X.beginPath();
      X.moveTo(mx - nx * spread, my - ny * spread);
      X.quadraticCurveTo(mx, my + Math.sin(v.age * 0.05 + i) * 4, mx + nx * spread, my + ny * spread);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  aracnidea_eightfold_riposte(v, X) {
    const s = v.spell;
    const t = v.state === 0 ? Math.min(1, v.age / s.riposteWind) : Math.max(0, 1 - v.age / 14);
    X.save();
    X.globalCompositeOperation = 'lighter';
    // Oito pernas abrindo em arco ao redor do player
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + v.age * 0.03;
      drawSpiderLeg(X, v.cx, v.cy - 12, a, 14 * t, 16 * t, i % 2 ? s.c2 : s.core, Math.sin(v.age * 0.2) * 0.3, 2);
    }
    X.restore();
    X.globalAlpha = 1;
  },

  aracnidea_matriarch_eclipse(v, X) {
    const s = v.spell;
    X.save();
    // Overlay escuro cobrindo a arena
    let darkA = 0;
    if (v.state === 0) darkA = Math.min(0.55, v.age / 50 * 0.55);
    else if (v.state === 1) darkA = 0.55;
    else darkA = Math.max(0, 0.55 - v.age / 40 * 0.55);
    X.fillStyle = ARAC.shadow;
    X.globalAlpha = darkA;
    X.fillRect(0, 0, state.W, state.H);
    X.globalAlpha = 1;
    // Mandala de teia colossal centrada no player
    const mandalaR = v.state === 0 ? 60 + v.age * 3 : 220 + Math.sin(v.age * 0.08) * 16;
    drawWebMandala(X, v.cx, v.cy, Math.min(mandalaR, 260), 12, 5, s.c2, 0.35, v.age * 0.01);
    drawWebMandala(X, v.cx, v.cy, Math.min(mandalaR, 260) * 0.6, 8, 3, s.core, 0.3, -v.age * 0.02);
    X.restore();
    X.globalAlpha = 1;
  },
};
