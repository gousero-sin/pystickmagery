// ═══════════════════════════════════════════════════════════════════════════
// elemental.js — Escola Elemental: Guias das Matas e da Encruzilhada
//
// Remake completo. Escola de INVOCAÇÃO ESPIRITUAL inspirada nas matrizes
// religiosas afro-indígenas brasileiras (Umbanda / Candomblé). Cada magia
// firma um guia que luta ao lado do jogador:
//
//   1 Caçador da Jurema   — Oxóssi / Caboclo : arqueiro espiritual das matas
//   2 Espada de Ogum      — Ogum            : guerreiro de ferro que avança e cliva
//   3 Manto de Pombagira  — Pombagira       : stand de rosas que seduz e protege
//   4 Tranca-Ruas         — Exu             : trickster que teleporta e fecha caminhos
//   5 Defumação           — Preto-Velho     : guia sentado que cura na fumaça do cachimbo
//   6 Falange das Crianças— Erês            : enxame de espíritos rápidos e brincalhões
//   7 Gira de Abertura    — Ultimate        : todos os guias manifestam de uma vez
// ═══════════════════════════════════════════════════════════════════════════

import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { isEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { createAlly } from '../core/allies.js?v=1';
import {
  SPELL_DEFS as NEW_SPELL_DEFS,
  FIRE_HANDLERS as NEW_FIRE_HANDLERS,
  PROJ_HOOKS as NEW_PROJ_HOOKS,
  TRAIL_EMITTERS as NEW_TRAIL_EMITTERS,
  VFX_UPDATE as NEW_VFX_UPDATE,
  VFX_DRAW as NEW_VFX_DRAW,
} from './elemental-new.js?v=1';

// ── Helpers locais sobre o state VIVO ───────────────────────────────────────
// utils.js importa state.js sem query (instância separada/vazia no browser),
// então suas funções spawnP/hurtEntity/explode/nearestEnemyEntity escrevem num
// state morto. Reimplementamos aqui contra o state vivo importado acima para
// que mira, dano, explosões e partículas funcionem de fato. isEnemyEntity é
// pura (recebe a entidade) e pode ser reutilizada da utils.
const PARTICLE_PRESETS = {
  burst: { vMul: 4, life: 30, size: 3, grav: 0.15 },
  explode: { vMul: 6, life: 55, size: 4, grav: 0.18 },
  trail: { vMul: 1.5, life: 15, size: 2, grav: 0.05 },
  sparkle: { vMul: 2, life: 40, size: 2, grav: -0.02 },
  smoke: { vMul: 1, life: 50, size: 5, grav: -0.04 },
  dust: { vMul: 1.5, life: 35, size: 3, grav: 0.05 },
  ember: { vMul: 2, life: 45, size: 2, grav: 0.06 },
};

function spawnP(x, y, color, count = 1, type = 'burst') {
  const pr = PARTICLE_PRESETS[type] || PARTICLE_PRESETS.burst;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = (0.5 + Math.random()) * pr.vMul;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: (pr.life + Math.random() * pr.life * 0.5) | 0, ml: pr.life,
      color, size: pr.size + Math.random() * 2, grav: pr.grav, type,
      rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.2,
    });
  }
}

function nearestEnemyEntity(x, y, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const d = Math.hypot(ex - x, ey - y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function hurtEntity(e, dmg) {
  if (dmg <= 0) return;
  e.hp -= dmg;
  e.hitF = 180;
  state.damageNumbers.push({
    x: e.x + e.w / 2, y: e.y - 8, val: dmg, life: 70, vy: -2,
    color: '#ff4444', sc: 1 + dmg / 30,
  });
  if (e.hp <= 0) {
    e.active = false;
    spawnP(e.x + e.w / 2, e.y + e.h / 2, '#aaa', 25, 'explode');
    if (e.explosive) explode(e.x + e.w / 2, e.y + e.h / 2, 60, 11, 28, '#ff6600', '#ffaa33');
  }
}

function explode(x, y, radius, force, dmg, c1, c2) {
  spawnP(x, y, c1, 20, 'explode');
  spawnP(x, y, c2, 12, 'burst');
  state.shockwaves.push({ x, y, r: 0, maxR: radius, life: 20, maxLife: 20, color: c1 });
  state.dynamicLights.push({ x, y, r: radius * 1.5, color: c1, int: 2, life: 12, ml: 12 });
  state.shake(Math.min(radius / 8, 15));
  for (const e of state.entities) {
    if (!e.active) continue;
    const d = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
    if (d < radius) {
      const pct = 1 - d / radius;
      hurtEntity(e, Math.floor(dmg * pct));
      const a = Math.atan2(e.y + e.h / 2 - y, e.x + e.w / 2 - x);
      const m = e.mass || 1;
      e.vx += Math.cos(a) * force * pct / m;
      e.vy += Math.sin(a) * force * pct / m - 2;
    }
  }
}

// ── Paletas temáticas por guia ──────────────────────────────────────────────
const PALETTE = {
  oxossi: ['#1d5926', '#5db75c', '#eaffc0'], // Mata: verde escuro, folha, luz dourada
  ogum:   ['#16284d', '#3f7fd6', '#ff5530'], // Ferro: aço escuro, lâmina, faísca rubra
  pomba:  ['#7a0a28', '#e02b5e', '#ffd0e6'], // Carmim, rosa, pétala
  exu:    ['#160808', '#e02222', '#ff9a3c'], // Encruzilhada: preto, vermelho, brasa
  preto:  ['#3a2a18', '#caa472', '#fff4d8'], // Terra, âmbar, fumaça clara
  ere:    ['#ff4d6d', '#ffd23f', '#7ad7ff'], // Crianças: vivo e multicolor
  gira:   ['#b8860b', '#ffd700', '#ffffff'], // Ouro ritual do terreiro
};

// ── Helpers de posição ──────────────────────────────────────────────────────
function playerCenter() {
  const p = state.player;
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

function bodyCenter(b) {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

// Move uma invocação suavemente em direção a um ponto. Devolve a distância.
function steerToward(v, tx, ty, maxSpeed, accel) {
  const dx = tx - v.cx;
  const dy = ty - v.cy;
  const d = Math.hypot(dx, dy) || 1;
  v.vx = (v.vx || 0) + (dx / d) * accel;
  v.vy = (v.vy || 0) + (dy / d) * accel;
  const sp = Math.hypot(v.vx, v.vy);
  if (sp > maxSpeed) {
    v.vx = (v.vx / sp) * maxSpeed;
    v.vy = (v.vy / sp) * maxSpeed;
  }
  v.cx += v.vx;
  v.cy += v.vy;
  return d;
}

// Dano corpo a corpo radial em torno de um ponto. Devolve nº de acertos.
function meleeBurst(x, y, range, dmg, knock, color) {
  let hits = 0;
  const r2 = range * range;
  for (const e of state.entities) {
    if (!isEnemyEntity(e)) continue;
    const ec = bodyCenter(e);
    const dx = ec.x - x;
    const dy = ec.y - y;
    if (dx * dx + dy * dy < r2) {
      hurtEntity(e, dmg, x, y);
      const a = Math.atan2(dy, dx);
      const m = e.mass || 1;
      e.vx += Math.cos(a) * knock / m;
      e.vy += Math.sin(a) * knock / m - 1.2;
      e.hitF = Math.max(e.hitF || 0, 12);
      spawnP(ec.x, ec.y, color, 6, 'sparkle');
      hits++;
    }
  }
  return hits;
}

// ── Ciclo de vida de aliado (entidade com HP que inimigos podem matar) ──────
function makeAlly(v, s, { w, h, threat, type }) {
  const a = createAlly({
    x: v.cx - w / 2, y: v.cy - h / 2, w, h,
    mana: s.mana, threat, type, color: s.color, c2: s.c2,
  });
  state.entities.push(a);
  v.ally = a;
  return a;
}

// Sincroniza a posição do corpo-aliado com a VFX. Retorna false se morreu.
function syncAlly(v) {
  const a = v.ally;
  if (!a) return true;
  if (!a.active || a.hp <= 0) return false;
  a.x = v.cx - a.w / 2;
  a.y = v.cy - a.h / 2;
  return true;
}

function endAlly(v) {
  if (v.ally) v.ally.active = false;
}

function drawAllyHp(X, v, yOff = 30) {
  const a = v.ally;
  if (!a || !a.active) return;
  const pct = Math.max(0, a.hp / a.maxHp);
  if (pct >= 0.999) return; // só aparece quando ferido
  const bx = v.cx - 14, by = v.cy - yOff;
  X.save();
  X.fillStyle = 'rgba(0,0,0,0.6)';
  X.fillRect(bx, by, 28, 4);
  X.fillStyle = pct > 0.5 ? '#7bd88f' : pct > 0.25 ? '#ffd23f' : '#ff5555';
  X.fillRect(bx, by, 28 * pct, 4);
  X.restore();
}

// ── Spell Definitions ───────────────────────────────────────────────────────
const LEGACY_SPELL_DEFS = [
  {
    name: 'Caçador da Jurema',
    icon: '🏹',
    key: '1',
    category: 'Summon',
    color: PALETTE.oxossi[0],
    c2: PALETTE.oxossi[1],
    core: PALETTE.oxossi[2],
    speed: 0, dmg: 7, mana: 30, cd: 2800,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'jurema',
    isOxossiHunter: true,
    summonDur: 660,
    desc: 'Firma um caboclo de Oxóssi que dispara flechas de luz da jurema, perfurando inimigos à distância.'
  },
  {
    name: 'Espada de Ogum',
    icon: '⚔️',
    key: '2',
    category: 'Summon',
    color: PALETTE.ogum[0],
    c2: PALETTE.ogum[1],
    core: PALETTE.ogum[2],
    speed: 0, dmg: 10, mana: 36, cd: 3200,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'iron_spark',
    isOgumWarrior: true,
    summonDur: 600,
    desc: 'Invoca o guerreiro de ferro de Ogum, que avança até os inimigos e cliva com a espada, abrindo caminhos.'
  },
  {
    name: 'Manto de Pombagira',
    icon: '🌹',
    key: '3',
    category: 'Stand',
    color: PALETTE.pomba[0],
    c2: PALETTE.pomba[1],
    core: PALETTE.pomba[2],
    speed: 0, dmg: 7, mana: 28, cd: 2000,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'rose_petal',
    isPombagiraStand: true,
    standDur: 900,
    desc: 'Um manto de rosas que orbita o jogador, seduz inimigos próximos e absorve projéteis. Reconjure para a Gargalhada: giro de espinhos e cura.'
  },
  {
    name: 'Tranca-Ruas',
    icon: '🔱',
    key: '4',
    category: 'Summon',
    color: PALETTE.exu[0],
    c2: PALETTE.exu[1],
    core: PALETTE.exu[2],
    speed: 0, dmg: 8, mana: 32, cd: 3000,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'ember_red',
    isExuTrickster: true,
    summonDur: 540,
    desc: 'Firma um Exu na encruzilhada que teleporta entre inimigos golpeando com o tridente e deixa marcas que fecham os caminhos.'
  },
  {
    name: 'Defumação',
    icon: '🕯️',
    key: '5',
    category: 'Summon',
    color: PALETTE.preto[0],
    c2: PALETTE.preto[1],
    core: PALETTE.preto[2],
    speed: 0, dmg: 2, mana: 30, cd: 4000,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'pipe_smoke',
    isPretoVelho: true,
    summonDur: 720,
    zoneR: 130,
    desc: 'Assenta um Preto-Velho que fuma o cachimbo. A fumaça da defumação cura o jogador e adoece inimigos próximos com lentidão.'
  },
  {
    name: 'Falange das Crianças',
    icon: '🎈',
    key: '6',
    category: 'Summon',
    color: PALETTE.ere[0],
    c2: PALETTE.ere[1],
    core: PALETTE.ere[2],
    speed: 0, dmg: 4, mana: 34, cd: 3400,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'child_spark',
    isEresSwarm: true,
    summonDur: 480,
    kidCount: 5,
    desc: 'Chama a falange dos Erês: cinco espíritos rápidos e brincalhões que correm e esbarram nos inimigos numa algazarra.'
  },
  {
    name: 'Gira de Abertura',
    icon: '🪘',
    key: '7',
    category: 'Ultimate',
    color: PALETTE.gira[0],
    c2: PALETTE.gira[1],
    core: PALETTE.gira[2],
    speed: 0, dmg: 38, mana: 82, cd: 6500,
    r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'gira_storm',
    isGiraUltimate: true,
    desc: 'Ritual maior (Ultimate): os tambores chamam toda a falange. Os guias manifestam em roda, puxam os inimigos e desferem um golpe conjunto.'
  }
];

const REMOVED_SPELLS = new Set([
  'Defumação',
  'Falange das Crianças',
]);

export const SPELL_DEFS = [
  ...LEGACY_SPELL_DEFS.filter((spell) => !REMOVED_SPELLS.has(spell.name)),
  ...NEW_SPELL_DEFS,
];

// ── Fire Handlers ────────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  ...NEW_FIRE_HANDLERS,
  isOxossiHunter(s, ox, oy, tx, ty) {
    const v = {
      type: 'elemental_oxossi_hunter',
      state: 0, age: 0, cx: tx, cy: ty, spell: s,
      facing: ox < tx ? 1 : -1, lastShoot: 0, hoverY: 0
    };
    state.vfxSequences.push(v);
    makeAlly(v, s, { w: 16, h: 34, threat: 35, type: 'ally-oxossi' });
    SoundFX.playSweep(150, 480, 'sine', 0.2, 0.35);
    SoundFX.playNoise(0.2, 0.25, 250, 'lowpass');
    spawnP(tx, ty, s.c2, 12, 'burst');
    state.dynamicLights.push({ x: tx, y: ty, r: 90, color: s.color, int: 2.2, life: 12, ml: 12 });
    return true;
  },

  isOgumWarrior(s, ox, oy, tx, ty) {
    const v = {
      type: 'elemental_ogum_warrior',
      state: 0, age: 0, cx: tx, cy: ty, spell: s,
      vx: 0, vy: 0, facing: ox < tx ? 1 : -1,
      slashAnim: 0, lastHit: -999, swing: 0
    };
    state.vfxSequences.push(v);
    makeAlly(v, s, { w: 18, h: 36, threat: 45, type: 'ally-ogum' });
    SoundFX.playSweep(110, 320, 'sawtooth', 0.22, 0.3);
    SoundFX.playNoise(0.25, 0.22, 180, 'lowpass', 1.5);
    spawnP(tx, ty, s.c2, 12, 'burst');
    spawnP(tx, ty, s.core, 8, 'sparkle');
    state.shake(5);
    state.dynamicLights.push({ x: tx, y: ty, r: 100, color: s.c2, int: 2.0, life: 12, ml: 12 });
    return true;
  },

  isPombagiraStand(s, ox, oy, tx, ty) {
    const existing = state.vfxSequences.find(v => v.type === 'elemental_pombagira_stand');
    if (existing) {
      // Reconjuração: "Gargalhada" — giro de espinhos radial + cura + sedução em área
      existing.age = Math.max(0, existing.age - 240);
      existing.pulseFlash = 16;
      state.shake(6);

      const p = state.player;
      p.hp = Math.min(p.maxHp, p.hp + 12);
      state.damageNumbers.push({
        x: p.x + p.w / 2, y: p.y - 12, val: 12, life: 52, vy: -1.4, color: '#ff5caa', sc: 1.25
      });

      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        state.projectiles.push(createPlayerProjectile({
          x: p.x + p.w / 2, y: p.y + p.h / 2,
          vx: Math.cos(a) * 9.5, vy: Math.sin(a) * 9.5,
          spell: {
            name: 'Espinho de Rosa',
            color: PALETTE.pomba[1], c2: PALETTE.pomba[2], core: '#ffffff',
            dmg: 12, r: 3, grav: 0, drag: 1, trail: 'thorn', _hook: PROJ_HOOKS.rosebud
          },
          life: 50
        }));
      }

      // Sedução em área no momento da gargalhada
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const ec = bodyCenter(e);
        if (Math.hypot(ec.x - existing.cx, ec.y - existing.cy) < 220) {
          e.hitF = Math.max(e.hitF || 0, 36);
          spawnP(ec.x, ec.y - 8, PALETTE.pomba[2], 4, 'sparkle');
        }
      }

      SoundFX.playSweep(620, 180, 'sawtooth', 0.22, 0.22);
      SoundFX.playTone(330, 'triangle', 0.18, 0.15);
      spawnP(p.x + p.w / 2, p.y + p.h / 2, PALETTE.pomba[2], 18, 'burst');
      spawnP(p.x + p.w / 2, p.y + p.h / 2, PALETTE.pomba[1], 10, 'sparkle');
      return true;
    }

    const p = state.player;
    const v = {
      type: 'elemental_pombagira_stand',
      state: 0, age: 0, cx: p.x + p.w / 2, cy: p.y + p.h / 2, spell: s,
      pulseFlash: 0
    };
    state.vfxSequences.push(v);
    makeAlly(v, s, { w: 16, h: 30, threat: 25, type: 'ally-pombagira' });
    SoundFX.playSweep(250, 720, 'sine', 0.16, 0.25);
    spawnP(p.x + p.w / 2, p.y + p.h / 2, PALETTE.pomba[1], 14, 'sparkle');
    state.dynamicLights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 80, color: s.color, int: 1.8, life: 10, ml: 10 });
    return true;
  },

  isExuTrickster(s, ox, oy, tx, ty) {
    const v = {
      type: 'elemental_exu_trickster',
      state: 0, age: 0, cx: tx, cy: ty, spell: s,
      facing: ox < tx ? 1 : -1, blinkTimer: 0, alpha: 0, lastStrike: 0
    };
    state.vfxSequences.push(v);
    makeAlly(v, s, { w: 16, h: 34, threat: 40, type: 'ally-exu' });
    SoundFX.playSweep(420, 90, 'sawtooth', 0.22, 0.28);
    SoundFX.playNoise(0.28, 0.2, 320, 'highpass', 2);
    spawnP(tx, ty, s.c2, 14, 'burst');
    spawnP(tx, ty, s.core, 8, 'ember');
    state.dynamicLights.push({ x: tx, y: ty, r: 90, color: s.c2, int: 2.0, life: 10, ml: 10 });
    return true;
  },

  isPretoVelho(s, ox, oy, tx, ty) {
    const v = {
      type: 'elemental_pretovelho_smoke',
      state: 0, age: 0, cx: tx, cy: ty, spell: s, puff: 0
    };
    state.vfxSequences.push(v);
    makeAlly(v, s, { w: 18, h: 26, threat: 15, type: 'ally-pretovelho' });
    SoundFX.playSweep(200, 120, 'sine', 0.16, 0.4);
    SoundFX.playNoise(0.18, 0.4, 240, 'lowpass');
    spawnP(tx, ty, s.c2, 10, 'smoke');
    state.dynamicLights.push({ x: tx, y: ty, r: 90, color: s.c2, int: 1.6, life: 12, ml: 12 });
    return true;
  },

  isEresSwarm(s, ox, oy, tx, ty) {
    const kids = [];
    const n = s.kidCount || 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      kids.push({
        x: tx + Math.cos(a) * 18, y: ty + Math.sin(a) * 18,
        vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
        hue: i % 3, phase: Math.random() * Math.PI * 2, lastHit: -999
      });
    }
    const v = {
      type: 'elemental_eres_swarm',
      state: 0, age: 0, cx: tx, cy: ty, spell: s, kids
    };
    state.vfxSequences.push(v);
    makeAlly(v, s, { w: 30, h: 28, threat: 30, type: 'ally-eres' });
    SoundFX.playSweep(420, 880, 'square', 0.12, 0.18);
    SoundFX.playTone(660, 'triangle', 0.12, 0.12);
    spawnP(tx, ty, s.color, 10, 'sparkle');
    spawnP(tx, ty, s.c2, 8, 'burst');
    state.dynamicLights.push({ x: tx, y: ty, r: 80, color: s.c2, int: 1.6, life: 8, ml: 8 });
    return true;
  },

  isGiraUltimate(s) {
    const c = playerCenter();
    state.vfxSequences.push({
      type: 'elemental_gira_ultimate',
      state: 0, age: 0, cx: c.x, cy: c.y, spell: s, flashFrame: 0
    });
    state.player.inv = true;
    SoundFX.playSweep(140, 520, 'sine', 0.35, 0.5);
    SoundFX.playNoise(0.3, 0.4, 180, 'lowpass');
    return true;
  }
};

// ── Projectile Hooks ──────────────────────────────────────────────────────────
export const PROJ_HOOKS = {
  ...NEW_PROJ_HOOKS,
  juremaArrow: {
    onLand(p, s) {
      spawnP(p.x, p.y, s.color, 8, 'burst');
      spawnP(p.x, p.y, s.core, 4, 'sparkle');
      SoundFX.playTone(740, 'sine', 0.08, 0.08);
      state.dynamicLights.push({ x: p.x, y: p.y, r: 42, color: s.color, int: 1.4, life: 8, ml: 8 });
    }
  },
  rosebud: {
    onLand(p, s) {
      spawnP(p.x, p.y, s.c2, 7, 'burst');
      spawnP(p.x, p.y, s.core, 3, 'sparkle');
      SoundFX.playTone(560, 'sine', 0.07, 0.09);
    }
  }
};

// ── Trail Particle Emitters ────────────────────────────────────────────────
export const TRAIL_EMITTERS = {
  ...NEW_TRAIL_EMITTERS,
  jurema(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 5, y: p.y + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.2,
      life: 22, ml: 22,
      color: Math.random() > 0.5 ? s.color : s.c2,
      size: 2.5 + Math.random() * 2, grav: 0.03,
      rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 0.15, type: 'dust'
    });
    if (p.age % 5 === 0) spawnP(p.x, p.y, s.core, 1, 'sparkle');
  },

  iron_spark(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 4, y: p.y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 2.4,
      life: 16, ml: 16,
      color: Math.random() > 0.55 ? s.core : s.c2,
      size: 1.6 + Math.random() * 1.6, grav: 0.12, type: 'ember'
    });
  },

  rose_petal(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
      life: 30, ml: 30,
      color: Math.random() > 0.5 ? s.c2 : s.color,
      size: 2.5 + Math.random() * 2, grav: 0.02,
      rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 0.1, type: 'dust'
    });
  },

  thorn(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 4, y: p.y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.8,
      life: 25, ml: 25,
      color: Math.random() > 0.45 ? s.color : s.c2,
      size: 2 + Math.random() * 2, grav: -0.015,
      rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 0.2, type: 'sparkle'
    });
  },

  ember_red(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 5, y: p.y + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random() * 1.2,
      life: 24, ml: 24,
      color: Math.random() > 0.5 ? s.c2 : s.core,
      size: 2 + Math.random() * 2, grav: -0.04, type: 'ember'
    });
  },

  pipe_smoke(p, s) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random() * 0.6,
      life: 50, ml: 50,
      color: Math.random() > 0.4 ? s.core : s.c2,
      size: 4 + Math.random() * 3, grav: -0.03, type: 'smoke'
    });
  },

  child_spark(p, s) {
    const cols = [s.color, s.c2, s.core];
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 5, y: p.y + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6,
      life: 18, ml: 18,
      color: cols[(Math.random() * 3) | 0],
      size: 2 + Math.random() * 2, grav: -0.02, type: 'sparkle'
    });
  },

  gira_storm(p, s) {
    const cols = [PALETTE.oxossi[1], PALETTE.pomba[1], PALETTE.exu[2], PALETTE.gira[1]];
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 8, y: p.y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
      life: 24, ml: 24,
      color: cols[(Math.random() * cols.length) | 0],
      size: 2.5 + Math.random() * 2.5, grav: -0.02, type: 'sparkle'
    });
  }
};

// ── VFX Update Handlers ────────────────────────────────────────────────────
export const VFX_UPDATE = {
  ...NEW_VFX_UPDATE,
  // 1 ─ Oxóssi: arqueiro estacionário que dispara flechas perfurantes
  elemental_oxossi_hunter(v) {
    const s = v.spell;

    if (v.state === 0) {
      if (v.age % 2 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 22, v.cy, s.color, 2, 'dust');
        spawnP(v.cx + (Math.random() - 0.5) * 16, v.cy - v.age * 0.6, s.c2, 1, 'sparkle');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy - v.age * 0.4, r: 30 + v.age * 2, color: s.c2, int: 0.9, life: 2, ml: 2 });
      if (v.age > 20) { v.state = 1; v.age = 0; v.lastShoot = 0; }
      return;
    }

    if (v.state === 1) {
      if (!syncAlly(v)) { v.state = 2; v.age = 0; return; }
      v.hoverY = Math.sin(performance.now() * 0.0035) * 4;

      if (v.age - v.lastShoot > 30) {
        const target = nearestEnemyEntity(v.cx, v.cy, 1200);
        if (target) {
          v.lastShoot = v.age;
          const tc = bodyCenter(target);
          const ang = Math.atan2(tc.y - (v.cy + v.hoverY - 12), tc.x - v.cx);
          v.facing = tc.x > v.cx ? 1 : -1;
          v.shootAnim = 12;
          v.recoilX = -Math.cos(ang) * 4;
          v.recoilY = -Math.sin(ang) * 4;

          state.projectiles.push(createPlayerProjectile({
            x: v.cx + Math.cos(ang) * 12,
            y: v.cy + v.hoverY - 12 + Math.sin(ang) * 12,
            vx: Math.cos(ang) * 16.5, vy: Math.sin(ang) * 16.5,
            spell: {
              name: 'Flecha da Jurema',
              color: s.core, c2: s.c2, core: '#ffffff',
              dmg: s.dmg, r: 4.5, grav: 0, drag: 1, trail: 'jurema',
              homing: true, homeStr: 0.08,
              juremaArrow: true, _hook: PROJ_HOOKS.juremaArrow
            },
            life: 90
          }));

          SoundFX.playSweep(550, 950, 'sine', 0.14, 0.12);
          spawnP(v.cx, v.cy + v.hoverY - 12, s.core, 6, 'sparkle');
        }
      }

      if (v.shootAnim > 0) v.shootAnim--;
      if (v.recoilX) v.recoilX *= 0.8;
      if (v.recoilY) v.recoilY *= 0.8;

      if (v.age % 14 === 0) {
        spawnP(v.cx + (Math.random() - 0.5) * 16, v.cy + v.hoverY + 6, s.c2, 1, 'dust');
        spawnP(v.cx + (Math.random() - 0.5) * 12, v.cy + v.hoverY - 14, s.core, 1, 'sparkle');
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy + v.hoverY - 10, r: 35, color: s.c2, int: 0.5, life: 2, ml: 2 });

      if (v.age > s.summonDur) { endAlly(v); v.state = 2; v.age = 0; }
      return;
    }

    if (v.state === 2) {
      if (v.age === 1) {
        spawnP(v.cx, v.cy - 10, s.color, 16, 'dust');
        spawnP(v.cx, v.cy - 10, s.core, 8, 'sparkle');
        SoundFX.playNoise(0.18, 0.22, 350, 'lowpass');
      }
      if (v.age > 15) removeVfx(v);
    }
  },

  // 2 ─ Ogum: guerreiro que avança e cliva corpo a corpo
  elemental_ogum_warrior(v) {
    const s = v.spell;

    if (v.state === 0) {
      if (v.age === 1) state.shake(4);
      if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - 0.5) * 20, v.cy + 10, s.c2, 1, 'ember');
      if (v.age > 14) { v.state = 1; v.age = 0; }
      return;
    }

    if (v.state === 1) {
      if (!syncAlly(v)) { v.state = 2; v.age = 0; return; }
      const target = nearestEnemyEntity(v.cx, v.cy, 1400);

      if (target) {
        const tc = bodyCenter(target);
        v.facing = tc.x >= v.cx ? 1 : -1;
        const dist = steerToward(v, tc.x, tc.y - 4, 4.6, 0.55);

        // Golpe quando em alcance e fora de cooldown
        if (dist < 58 && v.age - v.lastHit > 42) {
          v.lastHit = v.age;
          v.slashAnim = 14;
          v.swing = v.facing;
          const hx = v.cx + v.facing * 26;
          const hy = v.cy;
          const hits = meleeBurst(hx, hy, 46, s.dmg, 7.5, s.core);
          state.shockwaves.push({ x: hx, y: hy, r: 0, maxR: 50, life: 12, maxLife: 12, color: s.core });
          state.shake(hits > 0 ? 5 : 3);
          SoundFX.playSweep(360, 120, 'sawtooth', 0.2, 0.16);
          SoundFX.playNoise(0.2, 0.12, 900, 'highpass', 3);
          spawnP(hx, hy, s.core, 10, 'sparkle');
        }
      } else {
        // Sem alvo: ronda perto do jogador
        const p = state.player;
        steerToward(v, p.x + p.w / 2 + p.facing * 40, p.y + p.h / 2, 3.2, 0.35);
        v.vx *= 0.9; v.vy *= 0.9;
      }

      if (v.slashAnim > 0) v.slashAnim--;

      if (v.age % 10 === 0) spawnP(v.cx, v.cy + 14, s.c2, 1, 'ember');
      state.dynamicLights.push({ x: v.cx, y: v.cy - 8, r: 34, color: s.c2, int: 0.6, life: 2, ml: 2 });

      if (v.age > s.summonDur) { endAlly(v); v.state = 2; v.age = 0; }
      return;
    }

    if (v.state === 2) {
      if (v.age === 1) {
        spawnP(v.cx, v.cy - 6, s.c2, 14, 'ember');
        spawnP(v.cx, v.cy - 6, s.core, 6, 'sparkle');
        SoundFX.playNoise(0.18, 0.22, 240, 'lowpass');
      }
      if (v.age > 15) removeVfx(v);
    }
  },

  // 3 ─ Pombagira: stand de rosas que segue o jogador, seduz e absorve
  elemental_pombagira_stand(v) {
    const s = v.spell;
    const p = state.player;
    if (!p || p.hp <= 0) { endAlly(v); removeVfx(v); return; }

    v.pulseFlash = Math.max(0, (v.pulseFlash || 0) - 1);

    v.cx = p.x + p.w / 2 - p.facing * 16;
    v.cy = p.y + p.h / 2 - 8;

    if (!syncAlly(v)) { spawnP(v.cx, v.cy, s.core, 14, 'sparkle'); removeVfx(v); return; }

    // Botões de rosa perseguidores
    if (v.age % 40 === 0) {
      const target = nearestEnemyEntity(v.cx, v.cy, 420);
      if (target) {
        const tc = bodyCenter(target);
        const ang = Math.atan2(tc.y - v.cy, tc.x - v.cx);
        state.projectiles.push(createPlayerProjectile({
          x: v.cx, y: v.cy,
          vx: Math.cos(ang) * 8.5, vy: Math.sin(ang) * 8.5,
          spell: {
            name: 'Botão de Rosa',
            color: s.core, c2: s.c2, core: '#ffffff',
            dmg: Math.floor(s.dmg * 0.65), r: 3, grav: 0, drag: 1, trail: 'rose_petal',
            homing: true, homeStr: 0.09, _hook: PROJ_HOOKS.rosebud
          },
          life: 75
        }));
        spawnP(v.cx, v.cy, s.c2, 3, 'sparkle');
        SoundFX.playSweep(420, 780, 'sine', 0.08, 0.12);
      }
    }

    // Sedução: prende inimigos próximos com coraçõezinhos
    if (v.age % 24 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const ec = bodyCenter(e);
        const dx = ec.x - v.cx;
        const dy = ec.y - v.cy;
        if (dx * dx + dy * dy < 150 * 150) {
          e.hitF = Math.max(e.hitF || 0, 30);
          e.vx *= 0.6; e.vy *= 0.6;
          spawnP(ec.x, ec.y - 10, PALETTE.pomba[2], 2, 'sparkle');
        }
      }
    }

    if (v.age % 8 === 0) {
      state.particles.push({
        x: v.cx + (Math.random() - 0.5) * 24, y: v.cy + (Math.random() - 0.5) * 24,
        vx: -p.vx * 0.1 + (Math.random() - 0.5) * 0.4, vy: 0.4 + Math.random() * 0.6,
        life: 30 + Math.random() * 15, ml: 45,
        color: Math.random() > 0.5 ? s.c2 : s.color,
        size: 1.5 + Math.random() * 1.5, grav: 0.01,
        rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 0.05, type: 'dust'
      });
    }

    // Absorve projéteis hostis num raio protetor e cura levemente
    for (let i = 0; i < state.enemyProjectiles.length; i++) {
      const ep = state.enemyProjectiles[i];
      if (ep.life > 0) {
        const dx = ep.x - v.cx;
        const dy = ep.y - v.cy;
        if (dx * dx + dy * dy < 2704) {
          ep.life = 0;
          spawnP(ep.x, ep.y, s.core, 8, 'sparkle');
          p.hp = Math.min(p.maxHp, p.hp + 2);
          state.damageNumbers.push({
            x: p.x + p.w / 2, y: p.y - 12, val: 2, life: 30, vy: -1, color: PALETTE.pomba[2], sc: 0.95
          });
          SoundFX.playTone(880, 'sine', 0.1, 0.08);
        }
      }
    }

    if (v.age > s.standDur) {
      endAlly(v);
      spawnP(v.cx, v.cy, s.core, 12, 'sparkle');
      removeVfx(v);
    }
  },

  // 4 ─ Exu: trickster que teleporta entre inimigos e deixa marcas
  elemental_exu_trickster(v) {
    const s = v.spell;

    if (v.state === 0) {
      v.alpha = Math.min(1, v.age / 12);
      if (v.age % 2 === 0) spawnP(v.cx + (Math.random() - 0.5) * 18, v.cy, s.c2, 1, 'ember');
      if (v.age > 12) { v.state = 1; v.age = 0; v.blinkTimer = 0; }
      return;
    }

    if (v.state === 1) {
      if (!syncAlly(v)) { v.state = 2; v.age = 0; return; }
      v.alpha = 1;
      v.blinkTimer++;

      // Teleporta para perto de um inimigo periodicamente
      if (v.blinkTimer > 46) {
        const target = nearestEnemyEntity(v.cx, v.cy, 1600);
        if (target) {
          // Rastro de fumaça no ponto antigo
          spawnP(v.cx, v.cy, s.color, 10, 'smoke');
          spawnP(v.cx, v.cy, s.c2, 6, 'ember');

          const tc = bodyCenter(target);
          const side = Math.random() > 0.5 ? 1 : -1;
          v.cx = tc.x + side * 34;
          v.cy = tc.y - 4;
          v.facing = -side;
          v.blinkTimer = 0;
          v.strikeAnim = 14;

          // Golpe de tridente + marca de encruzilhada
          const hits = meleeBurst(tc.x, tc.y, 44, s.dmg, 5.5, s.c2);
          state.vfxSequences.push({
            type: 'elemental_exu_mark', age: 0, cx: tc.x, cy: tc.y + 6,
            r: 46, life: 150, color: s.c2, core: s.core
          });
          SoundFX.playSweep(520, 110, 'sawtooth', 0.2, 0.16);
          SoundFX.playNoise(0.2, 0.14, 600, 'bandpass', 4);
          spawnP(v.cx, v.cy, s.core, 10, 'ember');
          spawnP(tc.x, tc.y, s.c2, 8, 'burst');
          state.shake(hits > 0 ? 5 : 3);
          state.dynamicLights.push({ x: v.cx, y: v.cy, r: 60, color: s.c2, int: 1.4, life: 8, ml: 8 });
        } else {
          v.blinkTimer = 20; // tenta de novo logo
        }
      }

      if (v.strikeAnim > 0) v.strikeAnim--;
      if (v.age % 6 === 0) spawnP(v.cx, v.cy + 12, s.color, 1, 'smoke');

      if (v.age > s.summonDur) { endAlly(v); v.state = 2; v.age = 0; }
      return;
    }

    if (v.state === 2) {
      v.alpha = Math.max(0, 1 - v.age / 14);
      if (v.age === 1) {
        spawnP(v.cx, v.cy, s.color, 14, 'smoke');
        spawnP(v.cx, v.cy, s.c2, 8, 'ember');
        SoundFX.playNoise(0.16, 0.2, 280, 'highpass', 2);
      }
      if (v.age > 14) removeVfx(v);
    }
  },

  // Marca de encruzilhada deixada pelo Exu: zona de lentidão + dano leve
  elemental_exu_mark(v) {
    const r2 = v.r * v.r;
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      const ec = bodyCenter(e);
      const dx = ec.x - v.cx;
      const dy = ec.y - v.cy;
      if (dx * dx + dy * dy < r2) {
        e.vx *= 0.86; e.vy *= 0.92;
        if (v.age % 24 === 0) {
          hurtEntity(e, 2, v.cx, v.cy);
          spawnP(ec.x, ec.y, v.core, 2, 'ember');
        }
      }
    }
    if (v.age % 10 === 0) {
      const a = Math.random() * Math.PI * 2;
      spawnP(v.cx + Math.cos(a) * v.r * 0.7, v.cy + Math.sin(a) * v.r * 0.4, v.color, 1, 'ember');
    }
    if (v.age > v.life) removeVfx(v);
  },

  // 5 ─ Preto-Velho: guia sentado que cura na fumaça e adoece inimigos
  elemental_pretovelho_smoke(v) {
    const s = v.spell;
    const p = state.player;
    const R = s.zoneR;

    if (v.state === 0) {
      if (v.age === 1) state.shake(3);
      v.puff = Math.min(1, v.age / 20);
      if (v.age > 18) { v.state = 1; v.age = 0; }
      return;
    }

    if (v.state === 1) {
      if (!syncAlly(v)) { v.state = 2; v.age = 0; return; }
      // Fumaça subindo do cachimbo
      if (v.age % 4 === 0) {
        state.particles.push({
          x: v.cx + 10, y: v.cy - 14,
          vx: 0.3 + Math.random() * 0.3, vy: -0.7 - Math.random() * 0.5,
          life: 55, ml: 55, color: s.core, size: 3 + Math.random() * 3, grav: -0.02, type: 'smoke'
        });
      }
      // Névoa da defumação preenchendo a zona
      if (v.age % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * R;
        state.particles.push({
          x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r * 0.6,
          vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3,
          life: 45, ml: 45, color: Math.random() > 0.5 ? s.c2 : s.core,
          size: 4 + Math.random() * 4, grav: -0.01, type: 'smoke'
        });
      }

      // Cura o jogador quando dentro da fumaça
      if (p && p.hp > 0) {
        const pc = playerCenter();
        if (Math.hypot(pc.x - v.cx, pc.y - v.cy) < R && v.age % 30 === 0) {
          p.hp = Math.min(p.maxHp, p.hp + 4);
          state.damageNumbers.push({
            x: p.x + p.w / 2, y: p.y - 12, val: 4, life: 40, vy: -1.1, color: '#7bd88f', sc: 1.0
          });
          spawnP(pc.x, pc.y, '#7bd88f', 3, 'sparkle');
        }
      }

      // Inimigos na fumaça ficam lentos e adoecem
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const ec = bodyCenter(e);
        const dx = ec.x - v.cx;
        const dy = ec.y - v.cy;
        if (dx * dx + dy * dy < R * R) {
          e.vx *= 0.9; e.vy *= 0.95;
          if (v.age % 26 === 0) {
            hurtEntity(e, s.dmg, v.cx, v.cy);
            spawnP(ec.x, ec.y, s.c2, 2, 'smoke');
          }
        }
      }

      state.dynamicLights.push({ x: v.cx, y: v.cy - 6, r: 40, color: s.c2, int: 0.4, life: 2, ml: 2 });

      if (v.age > s.summonDur) { endAlly(v); v.state = 2; v.age = 0; }
      return;
    }

    if (v.state === 2) {
      v.puff = Math.max(0, 1 - v.age / 18);
      if (v.age === 1) spawnP(v.cx, v.cy - 6, s.core, 12, 'smoke');
      if (v.age > 18) removeVfx(v);
    }
  },

  // 6 ─ Erês: enxame de espíritos rápidos e brincalhões
  elemental_eres_swarm(v) {
    const s = v.spell;

    if (v.state === 0) {
      if (v.age > 8) { v.state = 1; v.age = 0; }
      return;
    }

    if (v.state === 1) {
      const now = v.age;
      // Centroide do enxame = hitbox do corpo-aliado (vida compartilhada)
      if (v.kids.length) {
        let cx0 = 0, cy0 = 0;
        for (const k of v.kids) { cx0 += k.x; cy0 += k.y; }
        v.cx = cx0 / v.kids.length;
        v.cy = cy0 / v.kids.length;
      }
      if (!syncAlly(v)) { v.state = 2; v.age = 0; return; }
      for (const k of v.kids) {
        const target = nearestEnemyEntity(k.x, k.y, 1000);
        k.phase += 0.25;
        let ax = 0, ay = 0;
        if (target) {
          const tc = bodyCenter(target);
          const dx = tc.x - k.x;
          const dy = tc.y - k.y;
          const d = Math.hypot(dx, dy) || 1;
          ax = (dx / d) * 0.55;
          ay = (dy / d) * 0.55;
          // Esbarrão: dano com cooldown próprio do espírito
          if (d < 26 && now - k.lastHit > 30) {
            k.lastHit = now;
            hurtEntity(target, s.dmg, k.x, k.y);
            // Quica para longe brincando
            k.vx = -(dx / d) * 4;
            k.vy = -(dy / d) * 4 - 1.5;
            spawnP(tc.x, tc.y, s.c2, 5, 'sparkle');
            SoundFX.playTone(720 + Math.random() * 200, 'square', 0.06, 0.06);
          }
        } else {
          // Sem alvo: orbita o jogador alegremente
          const pc = playerCenter();
          const dx = pc.x - k.x;
          const dy = pc.y - k.y;
          const d = Math.hypot(dx, dy) || 1;
          ax = (dx / d) * 0.3 - Math.sin(k.phase) * 0.4;
          ay = (dy / d) * 0.3 + Math.cos(k.phase) * 0.4;
        }
        // Movimento serelepe
        k.vx += ax + Math.cos(k.phase * 1.7) * 0.25;
        k.vy += ay + Math.sin(k.phase * 1.9) * 0.25;
        const sp = Math.hypot(k.vx, k.vy);
        const max = 5.2;
        if (sp > max) { k.vx = (k.vx / sp) * max; k.vy = (k.vy / sp) * max; }
        k.x += k.vx;
        k.y += k.vy;
        k.vx *= 0.96; k.vy *= 0.96;

        const cols = [s.color, s.c2, s.core];
        if (now % 3 === 0) spawnP(k.x, k.y, cols[k.hue], 1, 'sparkle');
      }

      // posição média para luz dinâmica
      if (v.age % 6 === 0 && v.kids.length) {
        let mx = 0, my = 0;
        for (const k of v.kids) { mx += k.x; my += k.y; }
        state.dynamicLights.push({ x: mx / v.kids.length, y: my / v.kids.length, r: 50, color: s.c2, int: 0.5, life: 2, ml: 2 });
      }

      if (v.age > s.summonDur) { endAlly(v); v.state = 2; v.age = 0; }
      return;
    }

    if (v.state === 2) {
      if (v.age === 1) {
        for (const k of v.kids) spawnP(k.x, k.y, s.c2, 6, 'sparkle');
        SoundFX.playSweep(660, 220, 'square', 0.1, 0.18);
      }
      if (v.age > 12) removeVfx(v);
    }
  },

  // 7 ─ Gira de Abertura: todos os guias manifestam de uma vez (Ultimate)
  elemental_gira_ultimate(v) {
    const s = v.spell;
    const p = state.player;
    if (!p || p.hp <= 0) { if (p) p.inv = false; removeVfx(v); return; }

    p.inv = true;
    p.vx = 0; p.vy = 0;
    p.castAnim = 160;
    p.castType = v.state === 2 ? 'slam' : 'up';

    if (v.age === 1) { v.cx = p.x + p.w / 2; v.cy = p.y + p.h / 2; }

    const guideColors = [
      PALETTE.oxossi[1], PALETTE.ogum[1], PALETTE.pomba[1],
      PALETTE.exu[2], PALETTE.preto[1], PALETTE.ere[0]
    ];

    // ESTÁGIO 0 — Tambores e mandala do terreiro
    if (v.state === 0) {
      if (v.age === 5 || v.age === 20 || v.age === 35 || v.age === 50) {
        state.shake(7);
        SoundFX.playNoise(0.55, 0.22, 110, 'lowpass', 1.2);
        SoundFX.playTone(130, 'triangle', 0.45, 0.18);
        spawnP(v.cx, v.cy, s.color, 15, 'burst');
      }
      if (v.age % 2 === 0) {
        const a = v.age * 0.18;
        const r = 240 - v.age * 3.8;
        spawnP(v.cx + Math.cos(a) * r, v.cy + Math.sin(a) * r * 0.5, PALETTE.oxossi[1], 1, 'sparkle');
        spawnP(v.cx - Math.cos(a) * r, v.cy - Math.sin(a) * r * 0.5, PALETTE.pomba[1], 1, 'dust');
      }
      if (v.age > 55) { v.state = 1; v.age = 0; }
      return;
    }

    // ESTÁGIO 1 — Os guias surgem em roda e puxam os inimigos
    if (v.state === 1) {
      if (v.age % 10 === 1) SoundFX.playNoise(0.3, 0.35, 650, 'bandpass', 4);

      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const ec = bodyCenter(e);
        const dx = v.cx - ec.x;
        const dy = v.cy - ec.y;
        const dist = Math.hypot(dx, dy) || 1;
        const m = e.mass || 1;
        e.vx += (dx / dist) * 2.8 / m;
        e.vy += (dy / dist) * 1.2 / m - 0.15;
        e.vx *= 0.82; e.vy *= 0.82;
        e.hitF = 10;
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 180 - v.age * 2.2;
        state.particles.push({
          x: v.cx + Math.cos(a) * r, y: v.cy + Math.sin(a) * r * 0.5,
          vx: -Math.sin(a) * 4, vy: Math.cos(a) * 1.5 - 0.4,
          life: 18, ml: 18,
          color: guideColors[(Math.random() * guideColors.length) | 0],
          size: 2.2 + Math.random() * 2, grav: -0.04, type: 'trail'
        });
      }

      if (v.age > 50) { v.state = 2; v.age = 0; }
      return;
    }

    // ESTÁGIO 2 — Golpe conjunto da falange
    if (v.state === 2) {
      if (v.age === 1 || v.age === 9 || v.age === 17) {
        state.shake(40);
        // Cada guia desfere seu golpe a partir de sua posição na roda
        for (let g = 0; g < 6; g++) {
          const ga = (g / 6) * Math.PI * 2 - v.age * 0.05;
          const gx = v.cx + Math.cos(ga) * 150;
          const gy = v.cy + Math.sin(ga) * 75;
          explode(gx, gy, 150, 22, s.dmg, guideColors[g], '#ffffff');
        }
        // Flechas e rosas para fora, evocando os guias
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          state.projectiles.push(createPlayerProjectile({
            x: v.cx, y: v.cy,
            vx: Math.cos(a) * 11, vy: Math.sin(a) * 11,
            spell: {
              name: 'Golpe da Falange',
              color: guideColors[k % 6], c2: PALETTE.gira[1], core: '#ffffff',
              dmg: Math.floor(s.dmg * 0.3), r: 4, grav: 0, drag: 1, trail: 'gira_storm',
              juremaArrow: true, _hook: PROJ_HOOKS.juremaArrow
            },
            life: 70
          }));
        }

        SoundFX.playNoise(1.4, 0.75, 75, 'lowpass', 1);
        SoundFX.playSweep(120, 750, 'sawtooth', 0.6, 0.45);
        SoundFX.playTone(200, 'triangle', 0.45, 0.35);
        v.flashFrame = 12;

        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
          const spd = 6 + Math.random() * 8;
          state.particles.push({
            x: v.cx, y: v.cy - 12,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd * 0.6 - 3.5,
            life: 80 + Math.random() * 40, ml: 120,
            color: guideColors[k % 6],
            size: 3 + Math.random() * 4, grav: 0.05,
            rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 0.25, type: 'dust'
          });
        }
      }

      if (v.flashFrame > 0) v.flashFrame--;

      if (v.age === 45) {
        p.hp = Math.min(p.maxHp, p.hp + 25);
        state.damageNumbers.push({
          x: p.x + p.w / 2, y: p.y - 12, val: 25, life: 60, vy: -1.2, color: '#44ff44', sc: 1.3
        });
      }

      if (v.age > 82) { p.inv = false; removeVfx(v); }
    }
  }
};

// ── Shared Draw helpers ──────────────────────────────────────────────────────
function drawGlow(X, x, y, r, inner, outer, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  X.globalAlpha = alpha;
  X.fillStyle = g;
  X.beginPath();
  X.arc(x, y, r, 0, Math.PI * 2);
  X.fill();
  X.restore();
}

// Base etérea (rodapé de luz) para guias que flutuam
function drawWispBase(X, cx, cy, color, t, w = 14) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  X.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) {
    const off = Math.sin(t * 2 + i) * 3;
    X.strokeStyle = color;
    X.lineWidth = 2 - i * 0.5;
    X.beginPath();
    X.ellipse(cx + off, cy + 8 + i * 3, w - i * 3, 3, 0, 0, Math.PI * 2);
    X.stroke();
  }
  X.restore();
}

// ── VFX Draw Handlers ─────────────────────────────────────────────────────────
export const VFX_DRAW = {
  ...NEW_VFX_DRAW,
  // 1 ─ Oxóssi: caboclo arqueiro
  elemental_oxossi_hunter(v, X) {
    const s = v.spell;
    drawAllyHp(X, v, 30);

    if (v.state === 0) {
      const pr = Math.min(1, v.age / 20);
      drawGlow(X, v.cx, v.cy, 35 * pr, `${s.c2}cc`, `${s.color}00`, pr * 0.7);
      return;
    }

    if (v.state === 1 || v.state === 2) {
      const fade = v.state === 2 ? Math.max(0, 1 - v.age / 15) : 1;
      const f = v.facing || 1;
      const cx = v.cx + (v.recoilX || 0);
      const cy = v.cy + (v.hoverY || 0) + (v.recoilY || 0);
      const t = performance.now() * 0.003;

      X.save();
      X.globalAlpha = fade;
      drawGlow(X, cx, cy - 10, 48, `${s.c2}55`, `${s.color}00`, 0.4 * fade);
      drawWispBase(X, cx, cy + 16, s.c2, t, 14);

      X.translate(cx, cy);
      X.scale(f, 1);

      // Capa de folhagem
      X.fillStyle = 'rgba(29, 89, 38, 0.45)';
      X.beginPath();
      X.moveTo(-8, -12);
      X.bezierCurveTo(-18, -2, -22, 16, -14, 24);
      X.bezierCurveTo(-8, 20, -4, 4, -8, -12);
      X.fill();

      // Corpo espiritual verde-dourado
      X.fillStyle = 'rgba(93, 183, 92, 0.65)';
      X.beginPath();
      X.moveTo(0, -22);
      X.bezierCurveTo(-6, -18, -7, -2, -4, 8);
      X.lineTo(4, 8);
      X.bezierCurveTo(7, -2, 6, -18, 0, -22);
      X.fill();

      // Cocar de penas
      X.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI * 0.65 - (i * 0.2);
        const length = 12 + Math.sin(performance.now() * 0.005 + i) * 2;
        X.strokeStyle = i % 2 === 0 ? s.core : s.c2;
        X.beginPath();
        X.moveTo(-2, -20);
        X.lineTo(Math.cos(ang) * length - 2, Math.sin(ang) * length - 20);
        X.stroke();
      }

      // Arco
      X.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      X.lineWidth = 2.6;
      X.beginPath();
      X.arc(10, -8, 14, -Math.PI * 0.45, Math.PI * 0.45);
      X.stroke();

      // Corda do arco com puxada animada
      X.strokeStyle = 'rgba(202, 255, 154, 0.8)';
      X.lineWidth = 1.5;
      X.beginPath();
      X.moveTo(10 + Math.cos(-Math.PI * 0.45) * 14, -8 + Math.sin(-Math.PI * 0.45) * 14);
      let pull = 0;
      if (v.shootAnim && v.shootAnim > 0) {
        pull = v.shootAnim * 0.8;
      } else {
        const since = v.age - v.lastShoot;
        if (since > 10 && since < 25) pull = (since - 10) * 0.5;
      }
      X.lineTo(10 - pull, -8);
      X.lineTo(10 + Math.cos(Math.PI * 0.45) * 14, -8 + Math.sin(Math.PI * 0.45) * 14);
      X.stroke();

      if (pull > 0) {
        X.strokeStyle = '#ffffff';
        X.lineWidth = 2;
        X.beginPath();
        X.moveTo(10 - pull, -8);
        X.lineTo(22, -8);
        X.stroke();
        X.fillStyle = s.core;
        X.beginPath();
        X.arc(22, -8, 2, 0, Math.PI * 2);
        X.fill();
      }

      X.fillStyle = '#ffffff';
      X.beginPath();
      X.arc(2, -18, 1.5, 0, Math.PI * 2);
      X.fill();

      X.restore();
      X.globalAlpha = 1;
    }
  },

  // 2 ─ Ogum: guerreiro de ferro
  elemental_ogum_warrior(v, X) {
    const s = v.spell;
    drawAllyHp(X, v, 32);
    const fade = v.state === 2 ? Math.max(0, 1 - v.age / 15) : Math.min(1, v.age / 12);
    const f = v.facing || 1;
    const t = performance.now() * 0.003;
    const cx = v.cx;
    const cy = v.cy;

    X.save();
    X.globalAlpha = fade;
    drawGlow(X, cx, cy - 8, 44, `${s.c2}55`, `${s.color}00`, 0.4 * fade);
    drawWispBase(X, cx, cy + 16, s.c2, t, 13);

    X.translate(cx, cy);
    X.scale(f, 1);

    // Manto/armadura de ferro
    X.fillStyle = 'rgba(22, 40, 77, 0.7)';
    X.beginPath();
    X.moveTo(-9, -10);
    X.bezierCurveTo(-16, 2, -16, 18, -9, 24);
    X.lineTo(9, 24);
    X.bezierCurveTo(16, 18, 16, 2, 9, -10);
    X.fill();

    // Corpo / peitoral
    X.fillStyle = 'rgba(63, 127, 214, 0.75)';
    X.beginPath();
    X.moveTo(0, -24);
    X.bezierCurveTo(-7, -20, -8, -4, -5, 6);
    X.lineTo(5, 6);
    X.bezierCurveTo(8, -4, 7, -20, 0, -24);
    X.fill();

    // Elmo
    X.fillStyle = 'rgba(120, 160, 220, 0.85)';
    X.beginPath();
    X.arc(0, -26, 6, 0, Math.PI * 2);
    X.fill();
    X.fillStyle = s.core;
    X.fillRect(-5, -28, 10, 2);

    // Espada — gira no golpe
    const swing = (v.slashAnim || 0) / 14;
    X.save();
    X.translate(10, -6);
    X.rotate(-0.7 + swing * 1.8);
    const grad = X.createLinearGradient(0, 0, 0, -34);
    grad.addColorStop(0, '#d7e6ff');
    grad.addColorStop(1, '#ffffff');
    X.strokeStyle = grad;
    X.lineWidth = 3.4;
    X.beginPath();
    X.moveTo(0, 4);
    X.lineTo(0, -34);
    X.stroke();
    // Guarda da espada
    X.strokeStyle = s.core;
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(-5, 0);
    X.lineTo(5, 0);
    X.stroke();
    X.restore();

    // Faísca de corte
    if (v.slashAnim && v.slashAnim > 6) {
      X.save();
      X.globalCompositeOperation = 'lighter';
      X.strokeStyle = `rgba(255,255,255,${swing})`;
      X.lineWidth = 3;
      X.beginPath();
      X.arc(20, -8, 22, -1.1, 0.6);
      X.stroke();
      X.restore();
    }

    X.fillStyle = '#ffffff';
    X.beginPath();
    X.arc(2, -26, 1.4, 0, Math.PI * 2);
    X.fill();

    X.restore();
    X.globalAlpha = 1;
  },

  // 3 ─ Pombagira: stand de rosas orbitando
  elemental_pombagira_stand(v, X) {
    drawAllyHp(X, v, 30);
    const t = performance.now() * 0.003;
    const breath = Math.sin(t * 1.8) * 3;
    const cx = v.cx;
    const cy = v.cy + breath;

    drawGlow(X, cx, cy, 50, 'rgba(224, 43, 94, 0.2)', 'rgba(140, 12, 46, 0)', 0.5);

    if (v.pulseFlash && v.pulseFlash > 0) {
      const radius = 90 * (1 - v.pulseFlash / 16);
      X.save();
      X.globalCompositeOperation = 'lighter';
      X.strokeStyle = `rgba(255, 204, 219, ${v.pulseFlash / 16})`;
      X.lineWidth = 3;
      X.beginPath();
      X.arc(cx, cy, radius, 0, Math.PI * 2);
      X.stroke();
      X.fillStyle = `rgba(255, 255, 255, ${v.pulseFlash / 20})`;
      for (let i = 0; i < 8; i++) {
        const pa = (i / 8) * Math.PI * 2 + t * 4;
        X.beginPath();
        X.arc(cx + Math.cos(pa) * radius * 0.8, cy + Math.sin(pa) * radius * 0.8, radius * 0.15, 0, Math.PI * 2);
        X.fill();
      }
      X.restore();
    }

    X.save();
    X.translate(cx, cy);

    X.globalCompositeOperation = 'lighter';
    X.strokeStyle = PALETTE.pomba[1];
    X.lineWidth = 1.5;
    X.beginPath();
    X.ellipse(0, 0, 24, 8, t, 0, Math.PI * 2);
    X.stroke();
    X.beginPath();
    X.ellipse(0, 0, 24, 8, -t * 0.8, 0, Math.PI * 2);
    X.stroke();

    X.globalCompositeOperation = 'source-over';
    X.globalAlpha = 0.85;
    X.fillStyle = PALETTE.pomba[1];
    X.beginPath();
    X.moveTo(0, -22);
    X.bezierCurveTo(-10, -18, -12, -4, -4, 2);
    X.bezierCurveTo(-8, 12, 8, 12, 4, 2);
    X.bezierCurveTo(12, -4, 10, -18, 0, -22);
    X.fill();
    X.strokeStyle = '#ffffff';
    X.lineWidth = 1;
    X.stroke();

    X.restore();
    X.globalAlpha = 1;
  },

  // 4 ─ Exu: trickster de capa
  elemental_exu_trickster(v, X) {
    const s = v.spell;
    drawAllyHp(X, v, 30);
    const a = v.alpha ?? 1;
    if (a <= 0.01) return;
    const f = v.facing || 1;
    const t = performance.now() * 0.004;
    const cx = v.cx;
    const cy = v.cy;

    X.save();
    X.globalAlpha = a;
    drawGlow(X, cx, cy - 6, 46, `${s.c2}66`, `${s.color}00`, 0.45 * a);

    X.translate(cx, cy);
    X.scale(f, 1);

    // Capa esvoaçante preta/vermelha
    X.fillStyle = 'rgba(22, 8, 8, 0.8)';
    X.beginPath();
    X.moveTo(-6, -12);
    X.bezierCurveTo(-20, -4, -18 + Math.sin(t) * 4, 18, -8, 26);
    X.lineTo(8, 26);
    X.bezierCurveTo(18 + Math.sin(t) * 4, 18, 20, -4, 6, -12);
    X.fill();

    // Corpo
    X.fillStyle = 'rgba(224, 34, 34, 0.6)';
    X.beginPath();
    X.moveTo(0, -22);
    X.bezierCurveTo(-6, -18, -7, -2, -4, 8);
    X.lineTo(4, 8);
    X.bezierCurveTo(7, -2, 6, -18, 0, -22);
    X.fill();

    // Cartola
    X.fillStyle = '#160808';
    X.fillRect(-7, -30, 14, 3);
    X.fillRect(-5, -40, 10, 11);

    // Tridente
    X.strokeStyle = s.core;
    X.lineWidth = 2;
    const tx = 12;
    X.beginPath();
    X.moveTo(tx, 10);
    X.lineTo(tx, -26);
    X.stroke();
    X.beginPath();
    X.moveTo(tx - 5, -26); X.lineTo(tx - 5, -34);
    X.moveTo(tx, -28); X.lineTo(tx, -38);
    X.moveTo(tx + 5, -26); X.lineTo(tx + 5, -34);
    X.stroke();

    // Olhos em brasa
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = s.core;
    X.beginPath();
    X.arc(2, -33, 1.6, 0, Math.PI * 2);
    X.fill();
    X.restore();

    X.restore();
    X.globalAlpha = 1;
  },

  // Marca de encruzilhada (X) deixada pelo Exu
  elemental_exu_mark(v, X) {
    const fade = Math.min(1, Math.min(v.age / 12, (v.life - v.age) / 25));
    if (fade <= 0) return;
    const t = performance.now() * 0.002;

    X.save();
    X.translate(v.cx, v.cy);
    X.scale(1, 0.5);
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = fade * 0.7;

    // Halo
    drawGlow(X, 0, 0, v.r, `${v.color}55`, `${v.color}00`, fade * 0.5);

    // X da encruzilhada girando devagar
    X.rotate(t);
    X.strokeStyle = v.core;
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(-v.r * 0.7, -v.r * 0.7); X.lineTo(v.r * 0.7, v.r * 0.7);
    X.moveTo(v.r * 0.7, -v.r * 0.7); X.lineTo(-v.r * 0.7, v.r * 0.7);
    X.stroke();

    X.strokeStyle = v.color;
    X.lineWidth = 1.5;
    X.beginPath();
    X.arc(0, 0, v.r * 0.85, 0, Math.PI * 2);
    X.stroke();

    X.restore();
    X.globalAlpha = 1;
  },

  // 5 ─ Preto-Velho: guia sentado fumando o cachimbo
  elemental_pretovelho_smoke(v, X) {
    const s = v.spell;
    drawAllyHp(X, v, 30);
    const puff = v.puff ?? 1;
    const t = performance.now() * 0.003;
    const cx = v.cx;
    const cy = v.cy;

    // Névoa da defumação no chão
    drawGlow(X, cx, cy, s.zoneR * puff, 'rgba(202,164,114,0.14)', 'rgba(58,42,24,0)', 0.6 * puff);

    X.save();
    X.globalAlpha = puff;

    // Banquinho
    X.fillStyle = 'rgba(58, 42, 24, 0.85)';
    X.fillRect(cx - 9, cy + 8, 18, 5);

    // Corpo curvado (manto claro)
    X.fillStyle = 'rgba(255, 244, 216, 0.7)';
    X.beginPath();
    X.moveTo(cx - 11, cy + 10);
    X.bezierCurveTo(cx - 13, cy - 6, cx - 6, cy - 16, cx, cy - 16);
    X.bezierCurveTo(cx + 7, cy - 16, cx + 13, cy - 4, cx + 11, cy + 10);
    X.fill();

    // Cabeça
    X.fillStyle = 'rgba(58, 42, 24, 0.9)';
    X.beginPath();
    X.arc(cx + 2, cy - 18, 5.5, 0, Math.PI * 2);
    X.fill();
    // Cabelo/barba branca
    X.fillStyle = 'rgba(255,255,255,0.8)';
    X.beginPath();
    X.arc(cx + 2, cy - 14, 4, 0, Math.PI);
    X.fill();

    // Cachimbo
    X.strokeStyle = '#caa472';
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(cx + 6, cy - 16);
    X.lineTo(cx + 12, cy - 18);
    X.stroke();
    // Brasa do cachimbo
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = '#ff7a3c';
    X.beginPath();
    X.arc(cx + 12.5, cy - 18.5, 1.6 + Math.sin(t * 4) * 0.6, 0, Math.PI * 2);
    X.fill();
    X.restore();

    X.restore();
    X.globalAlpha = 1;
  },

  // 6 ─ Erês: enxame de espíritos
  elemental_eres_swarm(v, X) {
    const s = v.spell;
    drawAllyHp(X, v, 24);
    const t = performance.now() * 0.006;
    const cols = [s.color, s.c2, s.core];
    const fade = v.state === 2 ? Math.max(0, 1 - v.age / 12) : 1;

    X.save();
    X.globalAlpha = fade;
    for (const k of v.kids) {
      const bob = Math.sin(t + k.phase) * 2;
      drawGlow(X, k.x, k.y + bob, 16, `${cols[k.hue]}aa`, `${cols[k.hue]}00`, 0.6 * fade);

      // Corpinho redondo travesso
      X.fillStyle = cols[k.hue];
      X.beginPath();
      X.arc(k.x, k.y + bob, 5, 0, Math.PI * 2);
      X.fill();
      // Carinha
      X.fillStyle = '#ffffff';
      X.beginPath();
      X.arc(k.x - 1.6, k.y + bob - 1, 1, 0, Math.PI * 2);
      X.arc(k.x + 1.6, k.y + bob - 1, 1, 0, Math.PI * 2);
      X.fill();
      // Balãozinho/penacho
      X.strokeStyle = cols[(k.hue + 1) % 3];
      X.lineWidth = 1;
      X.beginPath();
      X.moveTo(k.x, k.y + bob - 5);
      X.lineTo(k.x, k.y + bob - 10);
      X.stroke();
    }
    X.restore();
    X.globalAlpha = 1;
  },

  // 7 ─ Gira de Abertura (Ultimate)
  elemental_gira_ultimate(v, X) {
    const guideColors = [
      PALETTE.oxossi[1], PALETTE.ogum[1], PALETTE.pomba[1],
      PALETTE.exu[2], PALETTE.preto[1], PALETTE.ere[0]
    ];

    // Overlay de escurecimento
    if (v.state === 0 || v.state === 1) {
      const fade = v.state === 0 ? Math.min(0.85, v.age / 35) : 0.85;
      X.save();
      X.setTransform(1, 0, 0, 1, 0, 0);
      X.fillStyle = `rgba(5, 2, 8, ${fade})`;
      X.fillRect(0, 0, X.canvas.width, X.canvas.height);
      X.restore();
    }

    // Mandala do terreiro + guias em roda
    if (v.state === 0 || v.state === 1) {
      const pr = v.state === 0 ? Math.min(1, v.age / 40) : 1;
      const T = performance.now() * 0.002;
      X.save();
      X.translate(v.cx, v.cy);
      X.scale(1, 0.44);
      X.globalCompositeOperation = 'lighter';
      X.globalAlpha = pr * 0.9;

      X.strokeStyle = PALETTE.gira[1];
      X.lineWidth = 2.5;
      X.beginPath();
      X.arc(0, 0, 200 * pr, 0, Math.PI * 2);
      X.stroke();

      X.strokeStyle = PALETTE.oxossi[1];
      X.lineWidth = 1.8;
      X.beginPath();
      X.arc(0, 0, 140 * pr, 0, Math.PI * 2);
      X.stroke();

      X.save();
      X.rotate(T);
      X.strokeStyle = PALETTE.pomba[1];
      X.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const angle = (k / 8) * Math.PI * 2;
        X.beginPath();
        X.moveTo(0, 0);
        X.lineTo(Math.cos(angle - 0.15) * 180 * pr, Math.sin(angle - 0.15) * 180 * pr);
        X.lineTo(Math.cos(angle) * 220 * pr, Math.sin(angle) * 220 * pr);
        X.lineTo(Math.cos(angle + 0.15) * 180 * pr, Math.sin(angle + 0.15) * 180 * pr);
        X.closePath();
        X.stroke();
      }
      X.restore();

      // Seis guias manifestando em roda
      for (let g = 0; g < 6; g++) {
        const ga = (g / 6) * Math.PI * 2 - T * 0.5;
        const gx = Math.cos(ga) * 230 * pr;
        const gy = Math.sin(ga) * 230 * pr;
        X.save();
        X.translate(gx, gy);
        X.fillStyle = guideColors[g];
        X.beginPath();
        X.arc(0, -18, 11, 0, Math.PI * 2);
        X.fill();
        X.fillStyle = '#ffffff';
        X.fillRect(-5, -20, 3, 3);
        X.fillRect(2, -20, 3, 3);
        X.restore();
      }

      X.restore();
      X.globalAlpha = 1;
    }

    // Estágio 2 — flash do golpe conjunto
    if (v.state === 2 && v.flashFrame && v.flashFrame > 0) {
      X.save();
      X.setTransform(1, 0, 0, 1, 0, 0);
      X.fillStyle = `rgba(255, 255, 255, ${v.flashFrame / 12 * 0.8})`;
      X.fillRect(0, 0, X.canvas.width, X.canvas.height);
      X.restore();

      X.save();
      X.strokeStyle = '#ffffff';
      X.lineWidth = 12 + Math.random() * 8;
      X.shadowBlur = 40;
      X.shadowColor = PALETTE.gira[1];
      const numStrikes = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numStrikes; i++) {
        X.beginPath();
        const startX = v.cx + (Math.random() - 0.5) * 300;
        X.moveTo(startX, v.cy - 600);
        X.lineTo(startX + (Math.random() - 0.5) * 80, v.cy - 400);
        X.lineTo(v.cx + (Math.random() - 0.5) * 50, v.cy - 200);
        X.lineTo(v.cx, v.cy);
        X.stroke();
      }
      X.restore();
    }
  }
};
