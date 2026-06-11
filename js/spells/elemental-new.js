// elemental-new.js — five new rituals for the Elemental guide school.
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import {
  bodyCenter,
  damageEnemiesAlongSegment,
  damageEnemiesInRadius,
  drawBlade,
  drawRing,
  healPlayer,
  nearestEnemyOrPoint,
  playerCenter,
  removeVfx,
} from './revamp-helpers.js?v=1';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';

const EL = {
  pemba: '#f6f0d8',
  mata: '#4ba85a',
  ferro: '#3f7fd6',
  brasa: '#e02222',
  ouro: '#ffd23f',
  agua: '#7ad7ff',
  core: '#ffffff',
};

export const SPELL_DEFS = [
  {
    name: 'Ponto Riscado', icon: '✦', key: '5', category: 'Trap',
    color: EL.pemba, c2: EL.brasa, core: EL.core,
    speed: 0, dmg: 12, mana: 26, cd: 1180, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'pipe_smoke', isPontoRiscado: true, pontoR: 104, pontoDur: 210,
    desc: 'Risca um ponto de pemba no chão; inimigos que cruzam as linhas são presos por um giro curto da encruzilhada.',
  },
  {
    name: 'Porteira de Ferro', icon: '🚪', key: '6', category: 'Ward',
    color: '#16284d', c2: EL.ferro, core: '#ff5530',
    speed: 0, dmg: 16, mana: 32, cd: 1560, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'iron_spark', isPorteiraFerro: true, gateDur: 150,
    desc: 'Ogum firma uma porteira azul de ferro, bloqueando disparos hostis e empurrando inimigos para abrir caminho.',
  },
  {
    name: 'Folha de Amaci', icon: '🍃', key: '8', category: 'Support',
    color: '#1d5926', c2: EL.mata, core: '#eaffc0',
    speed: 0, dmg: 7, mana: 24, cd: 980, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'jurema', isFolhaAmaci: true, folhaDur: 180, leafCount: 6,
    desc: 'Folhas de amaci orbitam o jogador, curando em pequenas doses e partindo como lâminas verdes quando um inimigo se aproxima.',
  },
  {
    name: 'Maré de Atabaques', icon: '🪘', key: '9', category: 'Wave',
    color: EL.ouro, c2: '#ff4d6d', core: EL.core,
    speed: 0, dmg: 15, mana: 30, cd: 1360, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'gira_storm', isMareAtabaques: true, waveCount: 4,
    desc: 'A batida dos atabaques sai em marés concêntricas, alternando empurrão, puxão e dano para preparar a roda.',
  },
  {
    name: 'Cabaça de Encantaria', icon: '🏺', key: '0', category: 'Summon',
    color: '#3a2a18', c2: EL.agua, core: EL.core,
    speed: 0, dmg: 8, mana: 34, cd: 2200, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'pipe_smoke', isCabacaEncantaria: true, cabacaDur: 340, cabacaR: 165,
    desc: 'Uma cabaça encantada flutua como guia menor, cuspindo gotas de água de cheiro e deixando cura quando retorna.',
  },
];

export const FIRE_HANDLERS = {
  isPontoRiscado(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'elemental_ponto_riscado', state: 0, age: 0, cx: tx, cy: ty, spell: s, hit: new Map() });
    SoundFX.playNoise(0.2, 0.22, 220, 'lowpass');
    spawnP(tx, ty, s.color, 12, 'dust');
    return true;
  },

  isPorteiraFerro(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const angle = Math.atan2(ty - pc.y, tx - pc.x);
    state.vfxSequences.push({ type: 'elemental_porteira_ferro', state: 0, age: 0, ox: pc.x, oy: pc.y, angle, spell: s, hit: new Set() });
    SoundFX.playSweep(110, 330, 'sawtooth', 0.24, 0.26);
    state.shake(4);
    return true;
  },

  isFolhaAmaci(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    const leaves = Array.from({ length: s.leafCount }, (_, i) => ({ phase: (Math.PI * 2 * i) / s.leafCount, spent: false, x: pc.x, y: pc.y }));
    state.vfxSequences.push({ type: 'elemental_folha_amaci', state: 0, age: 0, leaves, spell: s });
    SoundFX.playTone(520, 'sine', 0.18, 0.28);
    return true;
  },

  isMareAtabaques(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'elemental_mare_atabaques', state: 0, age: 0, cx: pc.x, cy: pc.y, spell: s, pulses: 0 });
    SoundFX.playTone(120, 'triangle', 0.32, 0.2);
    SoundFX.playTone(180, 'triangle', 0.22, 0.26);
    return true;
  },

  isCabacaEncantaria(s, ox, oy, tx, ty) {
    const pc = playerCenter(ox, oy);
    state.vfxSequences.push({ type: 'elemental_cabaca_encantaria', state: 0, age: 0, cx: tx, cy: ty - 28, homeX: pc.x, homeY: pc.y, spell: s, phase: 0 });
    SoundFX.playSweep(220, 520, 'sine', 0.22, 0.35);
    spawnP(tx, ty, s.c2, 12, 'sparkle');
    return true;
  },
};

export const PROJ_HOOKS = {};
export const TRAIL_EMITTERS = {};

export const VFX_UPDATE = {
  elemental_ponto_riscado(v) {
    const s = v.spell;
    if (v.age % 14 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        const c = bodyCenter(e);
        const d = Math.hypot(c.x - v.cx, c.y - v.cy);
        if (d > s.pontoR) continue;
        const last = v.hit.get(e) || -999;
        if (v.age - last < 28) continue;
        v.hit.set(e, v.age);
        hurtEntity(e, s.dmg, v.cx, v.cy);
        e.vx *= 0.55;
        e.vy *= 0.62;
        spawnP(c.x, c.y, s.c2, 5, 'ember');
      }
    }
    state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.pontoR, color: s.c2, int: 0.5, life: 2, ml: 2 });
    if (v.age > s.pontoDur) removeVfx(v);
  },

  elemental_porteira_ferro(v) {
    const s = v.spell;
    const nx = Math.cos(v.angle);
    const ny = Math.sin(v.angle);
    const px = -ny;
    const py = nx;
    const front = Math.min(250, 30 + v.age * 2.4);
    const cx = v.ox + nx * front;
    const cy = v.oy + ny * front;
    damageEnemiesAlongSegment(cx + px * 70, cy + py * 70, cx - px * 70, cy - py * 70, 32, s.dmg, 7, s.c2, v.hit);
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = state.enemyProjectiles[i];
      const x = p.x ?? p.cx ?? 0;
      const y = p.y ?? p.cy ?? 0;
      if (Math.hypot(x - cx, y - cy) < 62) {
        state.enemyProjectiles.splice(i, 1);
        spawnP(x, y, s.core, 6, 'ember');
      }
    }
    if (v.age % 5 === 0) spawnP(cx, cy, s.c2, 2, 'sparkle');
    if (v.age > s.gateDur) removeVfx(v);
  },

  elemental_folha_amaci(v) {
    const s = v.spell;
    const pc = playerCenter();
    if (v.age % 30 === 0) healPlayer(1, s.core);
    for (const leaf of v.leaves) {
      leaf.phase += 0.085;
      if (!leaf.spent) {
        leaf.x = pc.x + Math.cos(leaf.phase) * 54;
        leaf.y = pc.y + Math.sin(leaf.phase) * 30;
        const target = nearestEnemyOrPoint(leaf.x, leaf.y, 120);
        if (target.entity) {
          hurtEntity(target.entity, s.dmg, leaf.x, leaf.y);
          leaf.spent = true;
          spawnP(target.x, target.y, s.c2, 4, 'sparkle');
        }
      } else {
        leaf.x += (pc.x - leaf.x) * 0.05;
        leaf.y += (pc.y - leaf.y) * 0.05;
      }
    }
    if (v.age > s.folhaDur) removeVfx(v);
  },

  elemental_mare_atabaques(v) {
    const s = v.spell;
    if (v.age % 18 === 1 && v.pulses < s.waveCount) {
      v.pulses += 1;
      const radius = 55 + v.pulses * 45;
      damageEnemiesInRadius(v.cx, v.cy, radius, s.dmg, v.pulses % 2 ? 5 : -3, v.pulses % 2 ? s.c2 : s.color);
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: radius, life: 18, maxLife: 18, color: v.pulses % 2 ? s.c2 : s.color });
      state.shake(3 + v.pulses);
    }
    if (v.age > 18 * (s.waveCount + 1)) removeVfx(v);
  },

  elemental_cabaca_encantaria(v) {
    const s = v.spell;
    v.phase += 0.06;
    const target = nearestEnemyOrPoint(v.cx, v.cy, s.cabacaR);
    if (target.entity) {
      v.cx += (target.x - v.cx) * 0.018;
      v.cy += (target.y - 46 - v.cy) * 0.018;
      if (v.age % 22 === 0) {
        hurtEntity(target.entity, s.dmg, v.cx, v.cy);
        state.lightningBolts.push({ segments: [{ x: v.cx, y: v.cy }, { x: target.x, y: target.y }], life: 10, color: s.c2, width: 1.8 });
        spawnP(target.x, target.y, s.c2, 4, 'sparkle');
      }
    } else {
      const pc = playerCenter(v.homeX, v.homeY);
      v.cx += (pc.x + Math.cos(v.phase) * 46 - v.cx) * 0.025;
      v.cy += (pc.y - 48 + Math.sin(v.phase) * 18 - v.cy) * 0.025;
    }
    if (v.age % 60 === 0) healPlayer(1, s.core);
    if (v.age > s.cabacaDur) {
      healPlayer(3, s.core);
      removeVfx(v);
    }
  },
};

export const VFX_DRAW = {
  elemental_ponto_riscado(v, X) {
    const s = v.spell;
    drawRing(X, v.cx, v.cy, s.pontoR, s.color, 0.46, 2);
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4 + v.age * 0.012;
      drawBlade(X, v.cx, v.cy, v.cx + Math.cos(a) * s.pontoR, v.cy + Math.sin(a) * s.pontoR * 0.7, 2, s.color, s.c2, 0.38);
    }
  },

  elemental_porteira_ferro(v, X) {
    const s = v.spell;
    const nx = Math.cos(v.angle);
    const ny = Math.sin(v.angle);
    const px = -ny;
    const py = nx;
    const front = Math.min(250, 30 + v.age * 2.4);
    const cx = v.ox + nx * front;
    const cy = v.oy + ny * front;
    drawBlade(X, cx + px * 74, cy + py * 74, cx - px * 74, cy - py * 74, 14, s.color, s.c2, 0.65);
    for (let i = -2; i <= 2; i++) {
      const x = cx + px * i * 32;
      const y = cy + py * i * 32;
      drawBlade(X, x - nx * 16, y - ny * 16, x + nx * 16, y + ny * 16, 5, s.c2, s.core, 0.7);
    }
  },

  elemental_folha_amaci(v, X) {
    const s = v.spell;
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (const leaf of v.leaves) {
      X.save();
      X.translate(leaf.x, leaf.y);
      X.rotate(leaf.phase);
      X.globalAlpha = leaf.spent ? 0.3 : 0.86;
      X.fillStyle = s.c2;
      X.beginPath();
      X.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2);
      X.fill();
      X.restore();
    }
    X.restore();
  },

  elemental_mare_atabaques(v, X) {
    const s = v.spell;
    for (let i = 1; i <= Math.max(1, v.pulses); i++) {
      drawRing(X, v.cx, v.cy, 55 + i * 45 + Math.sin(v.age * 0.2 + i) * 4, i % 2 ? s.c2 : s.color, 0.25, 3);
    }
  },

  elemental_cabaca_encantaria(v, X) {
    const s = v.spell;
    X.save();
    X.translate(v.cx, v.cy);
    X.rotate(Math.sin(v.phase) * 0.12);
    X.globalCompositeOperation = 'lighter';
    X.fillStyle = s.color;
    X.beginPath();
    X.ellipse(0, 4, 14, 20, 0, 0, Math.PI * 2);
    X.fill();
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.stroke();
    X.fillStyle = s.core;
    X.fillRect(-3, -21, 6, 10);
    X.restore();
  },
};
