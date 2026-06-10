// ═══════════════════════════════════════════════════════════════════════════
// dream.js — Dream / Sonho Spell School
//   Sono, alucinação, memória, projeção e mundos mentais.
//   Função: controle, ilusão, manipulação narrativa. Magia de sonhos e fadas.
//   Estética de percepção/imagem — irmã de PureCinema.
// ═══════════════════════════════════════════════════════════════════════════
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=9';

const PAL = { color: '#9d8bf0', c2: '#c9b8ff', core: '#efe6ff', dark: '#3a2f63' };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Keep a single persistent status ticker alive while any enemy is dream-asleep,
// so the floating "z z z" overlay is drawn over each sleeper.
function ensureDreamStatus() {
  if (!state.vfxSequences.some((v) => v.type === 'dream_status')) {
    state.vfxSequences.push({ type: 'dream_status', state: 0, age: 0, spell: { ...PAL, name: 'Dream Status' } });
  }
}

// Put an enemy to sleep: full stun via the shared freeze map + a tracked drowsy
// timer that drives the z-z-z overlay, plus a drowsy mote.
function sleepEntity(e, frames) {
  if (!e || !e.active) return;
  state.frozenEntities.set(e, Math.max(state.frozenEntities.get(e) || 0, frames));
  e._dreamSleep = Math.max(e._dreamSleep || 0, frames);
  ensureDreamStatus();
  spawnP(e.x + e.w / 2, e.y - 6, PAL.c2, 4, 'sparkle');
}

// ── Shared art helpers ─────────────────────────────────────────────────────
// A glowing fairy with flapping translucent wings. Used by Pixie Spark and the
// Fairy Swarm motes so every fairy in the school reads the same.
function drawFairy(X, x, y, age, pal, scale = 1) {
  const flap = Math.sin(age * 0.55);
  const bob = Math.sin(age * 0.18) * 1.4;
  X.save();
  X.translate(x, y + bob);
  // soft aura
  X.globalCompositeOperation = 'lighter';
  const aura = X.createRadialGradient(0, 0, 0, 0, 0, 12 * scale);
  aura.addColorStop(0, pal.core); aura.addColorStop(0.4, pal.color + '88'); aura.addColorStop(1, 'transparent');
  X.fillStyle = aura; X.globalAlpha = 0.55;
  X.beginPath(); X.arc(0, 0, 12 * scale, 0, Math.PI * 2); X.fill();
  X.globalCompositeOperation = 'source-over';
  // wings — an upper + lower pair each side, beating
  const spread = 0.55 + Math.abs(flap) * 0.55;
  for (const side of [-1, 1]) {
    X.save();
    X.rotate(side * (0.45 + flap * 0.4));
    const wg = X.createLinearGradient(0, 0, side * 9 * scale, 0);
    wg.addColorStop(0, pal.core + 'dd'); wg.addColorStop(1, pal.c2 + '00');
    X.fillStyle = wg; X.globalAlpha = 0.5;
    X.beginPath(); X.ellipse(side * 6 * scale, -3 * scale, 6.5 * scale * spread, 3.4 * scale, side * 0.5, 0, Math.PI * 2); X.fill();
    X.beginPath(); X.ellipse(side * 5 * scale, 2.4 * scale, 4.6 * scale * spread, 2.4 * scale, side * -0.4, 0, Math.PI * 2); X.fill();
    X.restore();
  }
  // body
  X.globalAlpha = 1;
  const bg = X.createRadialGradient(-1, -1, 0, 0, 0, 4 * scale);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, pal.core); bg.addColorStop(1, pal.color);
  X.fillStyle = bg;
  X.beginPath(); X.arc(0, 0, 3.2 * scale, 0, Math.PI * 2); X.fill();
  // head spark
  X.fillStyle = '#ffffff'; X.globalAlpha = 0.9;
  X.beginPath(); X.arc(0, -3.4 * scale, 1.5 * scale, 0, Math.PI * 2); X.fill();
  X.restore(); X.globalAlpha = 1;
}

// Floating "z z z" rising above a sleeper's head.
function drawSleepZs(X, cx, cy, age, pal) {
  X.save();
  for (let i = 0; i < 3; i++) {
    const t = ((age * 0.03 + i * 0.34) % 1);
    const zx = cx + 5 + i * 5 + Math.sin(age * 0.12 + i) * 3;
    const zy = cy - 8 - i * 7 - t * 12;
    X.globalAlpha = (1 - t) * 0.95;
    X.fillStyle = pal.core;
    X.font = `bold ${14 - i * 3}px serif`;
    X.fillText('z', zx, zy);
  }
  X.restore(); X.globalAlpha = 1;
}

// Vivid Nightmare projectile — a dark dream-orb with writhing shadow tendrils.
function drawNightmareOrb(X, x, y, age, s) {
  X.save();
  X.globalAlpha = 0.5; X.strokeStyle = s.color; X.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const a = age * 0.05 + (i / 5) * Math.PI * 2;
    const len = 6 + Math.sin(age * 0.15 + i) * 3;
    X.beginPath(); X.moveTo(x, y); X.lineTo(x + Math.cos(a) * (5 + len), y + Math.sin(a) * (5 + len)); X.stroke();
  }
  const g = X.createRadialGradient(x, y, 0, x, y, 7);
  g.addColorStop(0, s.c2); g.addColorStop(0.5, s.color); g.addColorStop(1, s.dark || PAL.dark);
  X.globalAlpha = 1; X.fillStyle = g;
  X.beginPath(); X.arc(x, y, 5.5, 0, Math.PI * 2); X.fill();
  X.restore(); X.globalAlpha = 1;
}

// Lullaby Mote projectile — a soft pulsing mote trailing a tiny drowsy 'z'.
function drawDrowsyMote(X, x, y, age, s) {
  const pulse = 0.8 + Math.sin(age * 0.2) * 0.2;
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, 8 * pulse);
  g.addColorStop(0, s.core); g.addColorStop(0.4, s.color + 'aa'); g.addColorStop(1, 'transparent');
  X.fillStyle = g; X.beginPath(); X.arc(x, y, 8 * pulse, 0, Math.PI * 2); X.fill();
  X.globalCompositeOperation = 'source-over';
  X.fillStyle = '#ffffff'; X.globalAlpha = 0.9;
  X.beginPath(); X.arc(x, y, 2.2, 0, Math.PI * 2); X.fill();
  X.globalAlpha = 0.7; X.fillStyle = s.core; X.font = 'bold 9px serif';
  X.fillText('z', x + 5 + Math.sin(age * 0.1) * 2, y - 6 - (age % 16) * 0.3);
  X.restore(); X.globalAlpha = 1;
}

export const SPELL_DEFS = [
  { name: 'Lullaby Mote', icon: '🎐', key: 'Q', category: 'Common', color: PAL.color, c2: PAL.c2, core: PAL.core, speed: 4, dmg: 6, mana: 10, cd: 320, r: 4, grav: 0, drag: .995, bounce: 0, exR: 0, exF: 0, trail: 'dream', isLullaby: true, sleepDur: 80, desc: 'Drowsy mote — adormece brevemente quem acerta' },
  { name: 'Pixie Spark', icon: '🧚', key: 'W', category: 'Common', color: '#a7f0e0', c2: '#d8fff6', core: '#ffffff', speed: 6, dmg: 9, mana: 8, cd: 220, r: 3, grav: 0, drag: .999, bounce: 0, exR: 12, exF: 2, trail: 'dream', homing: true, homeStr: .14, desc: 'Faísca de fada que persegue o alvo mais próximo' },
  { name: 'Vivid Nightmare', icon: '🌑', key: 'E', category: 'Common', color: '#6a4aa8', c2: '#a06ee0', core: '#e2cdff', speed: 3.4, dmg: 10, mana: 22, cd: 720, r: 5, grav: 0, drag: .997, bounce: 0, exR: 0, exF: 0, trail: 'dream', isNightmare: true, nightmareDur: 120, nightmareR: 64, desc: 'Pesadelo vívido — nuvem que fere e confunde os sonhadores' },
  { name: 'Deep Slumber', icon: '💤', key: 'S', category: 'Cast', color: PAL.color, c2: PAL.c2, core: PAL.core, speed: 0, dmg: 4, mana: 26, cd: 1100, r: 0, grav: 0, drag: 1, bounce: 0, isDeepSleep: true, sleepDur: 150, sleepR: 155, desc: 'Sono profundo — adormece os inimigos ao redor' },
  { name: 'Oneiric Cage', icon: '🌌', key: 'D', category: 'Trap', color: '#8f9cf0', c2: '#c9b8ff', core: '#efe6ff', speed: 0, dmg: 8, mana: 24, cd: 1000, r: 0, grav: 0, drag: 1, bounce: 0, isDreamPrison: true, cageR: 62, cageDur: 220, armDur: 360, desc: 'Prisão onírica — aprisiona o primeiro inimigo que entra' },
  { name: 'False Awakening', icon: '🪞', key: 'F', category: 'Teleport', color: PAL.color, c2: PAL.c2, core: PAL.core, speed: 0, dmg: 0, mana: 18, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0, isFalseAwakening: true, blinkDist: 168, decoyDur: 140, desc: 'Falso despertar — pisca deixando um duplo onírico para trás' },
  { name: 'Fairy Swarm', icon: '✨', key: 'A', category: 'Summon', color: '#b8f0c0', c2: '#e6fff0', core: '#ffffff', speed: 0, dmg: 5, mana: 28, cd: 1300, r: 0, grav: 0, drag: 1, bounce: 0, isFairySwarm: true, swarmCount: 5, swarmDur: 380, swarmR: 220, desc: 'Convoca um enxame de fadas que orbita e fere os inimigos' },
  { name: 'Reverie Ray', icon: '🌠', key: 'Z', category: 'Ray', color: '#b69dff', c2: '#d9c8ff', core: '#ffffff', speed: 0, dmg: 2, mana: 1, cd: 30, r: 0, grav: 0, drag: 1, bounce: 0, isReverieRay: true, rayW: 4, desc: 'Raio de devaneio contínuo — segure o clique; às vezes adormece' },
  { name: 'Mirage Step', icon: '👣', key: 'X', category: 'Dash', color: PAL.color, c2: PAL.c2, core: PAL.core, speed: 0, dmg: 0, mana: 16, cd: 760, r: 0, grav: 0, drag: 1, bounce: 0, isMirageStep: true, dashDist: 138, desc: 'Reposiciona como miragem, deixando ecos oníricos pelo caminho' },
  { name: 'Dreamscape Collapse', icon: '🌙', key: 'T', category: 'Ultimate', color: '#b69dff', c2: '#e2cdff', core: '#ffffff', speed: 0, dmg: 40, mana: 80, cd: 60000, r: 0, grav: 0, drag: 1, bounce: 0, isDreamscape: true, sleepDur: 200, desc: '(Ultimate) Colapso onírico — o mundo dorme enquanto o sonho desaba' },
];

// ── Cast handlers ────────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  isDeepSleep: (s, ox, oy) => {
    const cx = state.player.x + state.player.w / 2, cy = state.player.y + state.player.h / 2;
    state.vfxSequences.push({ type: 'dream_slumber', state: 0, age: 0, cx, cy, spell: s });
    state.player.castAnim = 300; state.player.castType = 'front_pose'; state.player.staffGlow = 300;
    SoundFX.playSweep(520, 180, 'sine', 0.5, 0.25);
    return true;
  },
  isDreamPrison: (s, ox, oy, tx, ty) => {
    state.vfxSequences.push({ type: 'dream_cage', state: 0, age: 0, cx: tx, cy: ty, spell: s, captured: null });
    state.player.castAnim = 240; state.player.castType = 'thrust';
    SoundFX.playTone(420, 'triangle', 0.3, 0.12);
    return true;
  },
  isFalseAwakening: (s, ox, oy, tx, ty) => {
    const p = state.player;
    const startX = p.x, startY = p.y;
    const ang = Math.atan2(ty - (p.y + p.h / 2), tx - (p.x + p.w / 2));
    p.x = clamp(p.x + Math.cos(ang) * s.blinkDist, 10, state.W - p.w - 10);
    p.y = clamp(p.y + Math.sin(ang) * s.blinkDist, 10, state.H - p.h - 10);
    p.vx *= 0.3; p.vy *= 0.3; p.inv = true;
    state.vfxSequences.push({ type: 'dream_decoy', state: 0, age: 0, x: startX, y: startY, spell: s });
    spawnP(startX + p.w / 2, startY + p.h / 2, s.c2, 14, 'sparkle');
    spawnP(p.x + p.w / 2, p.y + p.h / 2, s.core, 14, 'sparkle');
    SoundFX.playSweep(900, 1600, 'sine', 0.3, 0.12);
    state.player.castAnim = 200; state.player.castType = 'front_pose';
    return true;
  },
  isFairySwarm: (s) => {
    const motes = [];
    const px = state.player.x + state.player.w / 2, py = state.player.y + state.player.h / 2 - 4;
    for (let k = 0; k < (s.swarmCount || 5); k++) {
      const a = (k / s.swarmCount) * Math.PI * 2, r = 34 + (k % 2) * 14;
      // Seed x/y so the first draw never sees an undefined position.
      motes.push({ a, r, zapCd: 20 + k * 6, x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * 0.7 });
    }
    state.vfxSequences.push({ type: 'dream_swarm', state: 0, age: 0, motes, spell: s });
    // Cast bloom: a spiral of fairy dust bursts outward as the swarm awakens.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      spawnP(px + Math.cos(a) * 12, py + Math.sin(a) * 12, i % 2 ? s.c2 : s.core, 1, 'sparkle');
    }
    state.shockwaves.push({ x: px, y: py, r: 0, maxR: 64, life: 14, maxLife: 14, color: s.c2 });
    state.dynamicLights.push({ x: px, y: py, r: 90, color: s.color, int: 1.4, life: 14, ml: 14 });
    state.player.castAnim = 260; state.player.castType = 'front_pose';
    SoundFX.playSweep(700, 1300, 'triangle', 0.25, 0.12);
    return true;
  },
  isReverieRay: (s, ox, oy, tx, ty) => {
    state.vfxSequences.push({ type: 'dream_ray', state: 0, age: 0, spell: s });
    return true;
  },
  isMirageStep: (s, ox, oy, tx, ty) => {
    const p = state.player;
    const ang = Math.atan2(ty - (p.y + p.h / 2), tx - (p.x + p.w / 2));
    const echoes = [];
    const steps = 5;
    const startX = p.x, startY = p.y;
    const endX = clamp(p.x + Math.cos(ang) * s.dashDist, 10, state.W - p.w - 10);
    const endY = clamp(p.y + Math.sin(ang) * s.dashDist, 10, state.H - p.h - 10);
    for (let k = 0; k <= steps; k++) {
      const ex = startX + (endX - startX) * (k / steps);
      const ey = startY + (endY - startY) * (k / steps);
      echoes.push({ x: ex, y: ey, age: 0 });
      // Damage enemies passed through
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.hypot(e.x + e.w / 2 - (ex + p.w / 2), e.y + e.h / 2 - (ey + p.h / 2)) < 26) {
          if (!e._mirageHit) { hurtEntity(e, s.dmg, ex, ey); e._mirageHit = true; spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 8, 'burst'); }
        }
      }
    }
    for (const e of state.entities) e._mirageHit = false;
    p.x = endX; p.y = endY; p.vx = Math.cos(ang) * 3; p.vy = Math.sin(ang) * 1.5 - 1; p.inv = true;
    state.vfxSequences.push({ type: 'dream_mirage', state: 0, age: 0, echoes, spell: s });
    SoundFX.playSweep(600, 1100, 'sine', 0.22, 0.1);
    state.player.castAnim = 200; state.player.castType = 'thrust';
    state.shake(3);
    return true;
  },
  isDreamscape: (s) => {
    state.vfxSequences.push({ type: 'dream_scape', state: 0, age: 0, spell: s, dealt: false });
    state.player.castAnim = 600; state.player.castType = 'front_pose'; state.player.staffGlow = 600;
    SoundFX.playSweep(300, 80, 'sine', 1.2, 0.4);
    state.shake(10);
    return true;
  },
};

// ── Projectile hooks ──────────────────────────────────────────────────────────
export const PROJ_HOOKS = {
  isLullaby: {
    onLand: (p, s, hitPlat, hitEntity) => {
      if (hitEntity && isEnemyEntity(hitEntity)) sleepEntity(hitEntity, s.sleepDur);
      spawnP(p.x, p.y, s.c2, 8, 'sparkle');
      SoundFX.playTone(880, 'sine', 0.25, 0.08);
    },
  },
  isNightmare: {
    onLand: (p, s, hitPlat, hitEntity) => {
      state.vfxSequences.push({ type: 'dream_nightmare', state: 0, age: 0, cx: p.x, cy: p.y, spell: s });
      spawnP(p.x, p.y, s.color, 12, 'void');
      SoundFX.playSweep(260, 120, 'sawtooth', 0.35, 0.18);
      return true; // handled the impact; skip generic burst
    },
  },
};

export const TRAIL_EMITTERS = {
  dream: (p, s) => {
    if ((p.age || 0) % 3 === 0) {
      spawnP(p.x + (Math.random() - .5) * 4, p.y + (Math.random() - .5) * 4, s.c2 || PAL.c2, 1, 'sparkle');
    }
  },
};

// ── Custom projectile bodies (keyed by trail name) ─────────────────────────
// Pixie Spark flies as a winged fairy; Vivid Nightmare as a dark dream-orb;
// Lullaby Mote as a drowsy glowing mote — so the school never reads "generic".
export const PROJ_DRAW = {
  dream: (p, s, X) => {
    const age = p.age || 0;
    if (s.homing) drawFairy(X, p.x, p.y, age, { color: s.color, c2: s.c2, core: s.core }, 1.15);
    else if (s.isNightmare) drawNightmareOrb(X, p.x, p.y, age, s);
    else drawDrowsyMote(X, p.x, p.y, age, s);
  },
};

// ── VFX update ────────────────────────────────────────────────────────────────
export const VFX_UPDATE = {
  dream_slumber: (v) => {
    const s = v.spell;
    if (v.age === 1) {
      state.shake(4);
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.sleepR * 1.2, color: s.color, int: 2, life: 8, ml: 8 });
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.sleepR) {
          sleepEntity(e, s.sleepDur);
          if (s.dmg) hurtEntity(e, s.dmg, v.cx, v.cy);
        }
      }
    }
    if (v.age % 3 === 0) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * s.sleepR;
      spawnP(v.cx + Math.cos(a) * rr, v.cy + Math.sin(a) * rr, s.c2, 1, 'sparkle');
    }
    if (v.age > 46) v.done = true;
  },
  dream_nightmare: (v) => {
    const s = v.spell;
    if (v.age % 6 === 0) {
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.nightmareR) {
          hurtEntity(e, 3, v.cx, v.cy);
          e.vx += (Math.random() - .5) * 4; // confusion / thrash
          spawnP(e.x + e.w / 2, e.y + e.h / 2, s.color, 2, 'void');
        }
      }
    }
    if (v.age % 2 === 0) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * s.nightmareR;
      spawnP(v.cx + Math.cos(a) * rr, v.cy + Math.sin(a) * rr, Math.random() > .5 ? s.color : s.dark || PAL.dark, 1, 'void');
    }
    if (v.age > s.nightmareDur) v.done = true;
  },
  dream_cage: (v) => {
    const s = v.spell;
    if (v.state === 0) { // arming — wait for an enemy to enter
      if (v.age % 4 === 0) spawnP(v.cx + (Math.random() - .5) * s.cageR, v.cy + (Math.random() - .5) * s.cageR, s.c2, 1, 'sparkle');
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy) < s.cageR * 0.7) {
          v.captured = e; v.state = 1; v.age = 0;
          if (s.dmg) hurtEntity(e, s.dmg, v.cx, v.cy);
          state.shake(5); SoundFX.playSweep(1200, 600, 'square', 0.3, 0.14);
          state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: s.cageR, life: 10, maxLife: 10, color: s.core });
          break;
        }
      }
      if (v.age > s.armDur) v.done = true;
    } else if (v.state === 1) { // imprisoned
      const e = v.captured;
      if (!e || !e.active) { v.done = true; return; }
      e.x = v.cx - e.w / 2; e.y = v.cy - e.h / 2; e.vx = 0; e.vy = 0;
      state.frozenEntities.set(e, 4);
      if (v.age % 14 === 0) hurtEntity(e, 2, v.cx, v.cy);
      if (v.age % 5 === 0) spawnP(v.cx + (Math.random() - .5) * s.cageR, v.cy + (Math.random() - .5) * s.cageR, s.c2, 1, 'sparkle');
      if (v.age > s.cageDur) v.done = true;
    }
  },
  dream_decoy: (v) => {
    const s = v.spell;
    if (v.age === 1) state.player.inv = false;
    if (v.age % 5 === 0) spawnP(v.x + 7, v.y + 15, s.color, 1, 'void');
    if (v.age === s.decoyDur) {
      // decoy collapses into a soft burst
      state.shockwaves.push({ x: v.x + 7, y: v.y + 15, r: 0, maxR: 70, life: 10, maxLife: 10, color: s.c2 });
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        if (Math.hypot(e.x + e.w / 2 - (v.x + 7), e.y + e.h / 2 - (v.y + 15)) < 70) { hurtEntity(e, 10, v.x, v.y); sleepEntity(e, 60); }
      }
      spawnP(v.x + 7, v.y + 15, s.core, 16, 'sparkle');
      SoundFX.playSweep(1400, 400, 'sine', 0.3, 0.14);
      v.done = true;
    }
  },
  dream_swarm: (v) => {
    const s = v.spell;
    const px = state.player.x + state.player.w / 2, py = state.player.y + state.player.h / 2 - 4;
    for (const m of v.motes) {
      m.a += 0.12;
      m.x = px + Math.cos(m.a) * m.r;
      m.y = py + Math.sin(m.a) * m.r * 0.7;
      m.zapCd--;
      if (m.zapCd <= 0) {
        const tgt = nearestEnemyEntity(m.x, m.y, s.swarmR);
        if (tgt) {
          const tx = tgt.x + tgt.w / 2, ty = tgt.y + tgt.h / 2;
          hurtEntity(tgt, s.dmg, m.x, m.y);
          // Engine's drawLightning expects { segments: [{x,y}…], life, color, width }.
          state.lightningBolts.push({
            segments: [
              { x: m.x, y: m.y },
              { x: (m.x + tx) / 2 + (Math.random() - .5) * 14, y: (m.y + ty) / 2 + (Math.random() - .5) * 14 },
              { x: tx, y: ty },
            ],
            life: 7, color: s.core, width: 1.6,
          });
          spawnP(tx, ty, s.core, 4, 'burst');
          SoundFX.playTone(1500, 'sine', 0.12, 0.06);
          m.zapCd = 36;
        } else { m.zapCd = 10; }
      }
      if (v.age % 4 === 0) spawnP(m.x, m.y, s.c2, 1, 'sparkle');
    }
    if (v.age > s.swarmDur) v.done = true;
  },
  dream_ray: (v) => {
    const s = v.spell;
    const ox = state.player.x + state.player.w / 2 + state.player.facing * 10, oy = state.player.y + 8;
    const angle = Math.atan2(state.mouse.y - oy, state.mouse.x - ox);
    let hx = ox, hy = oy; const step = 4, maxDist = 380;
    for (let d = 0; d < maxDist; d += step) {
      hx = ox + Math.cos(angle) * d; hy = oy + Math.sin(angle) * d;
      let hitP = false;
      for (const pl of state.platforms) { if (hx > pl.x && hx < pl.x + pl.w && hy > pl.y && hy < pl.y + pl.h) { hitP = true; break; } }
      if (hitP || hx < 0 || hx > state.W || hy < 0 || hy > state.H) break;
    }
    const maxD = Math.hypot(hx - ox, hy - oy);
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      const l1 = (ex - ox) * Math.cos(angle) + (ey - oy) * Math.sin(angle);
      if (l1 > 0 && l1 < maxD && Math.hypot(ex - (ox + Math.cos(angle) * l1), ey - (oy + Math.sin(angle) * l1)) < 16) {
        if (v.age % 5 === 0) hurtEntity(e, s.dmg, hx, hy);
        if (Math.random() < 0.04) sleepEntity(e, 50);
        spawnP(ex, ey, s.c2, 1, 'sparkle');
      }
    }
    v.hx = hx; v.hy = hy; v.ox = ox; v.oy = oy;
    state.dynamicLights.push({ x: hx, y: hy, r: 50, color: s.color, int: 2, life: 2, ml: 2 });
    state.player.castAnim = 280; state.player.castType = 'channel'; state.player.sq = 1.15; state.player.st = 1 / state.player.sq;
    if (v.age % 6 === 0) SoundFX.playTone(900 + Math.random() * 200, 'sine', 0.08, 0.06);
    if (!state.mouse.down || state.player.mana < 1) v.done = true;
    else state.player.mana -= 0.22;
  },
  dream_mirage: (v) => {
    for (const e of v.echoes) e.age = (e.age || 0) + 1;
    if (v.age === 2) state.player.inv = false;
    if (v.age > 22) v.done = true;
  },
  dream_scape: (v) => {
    const s = v.spell;
    if (v.age === 1) {
      state.shake(12);
      state.dynamicLights.push({ x: state.W / 2, y: state.H / 2, r: state.W, color: s.color, int: 3, life: 30, ml: 30 });
    }
    // Sleep everything immediately; deal heavy dream damage in a pulse mid-sequence.
    if (v.age % 4 === 0) {
      for (const e of state.entities) { if (isEnemyEntity(e)) sleepEntity(e, s.sleepDur); }
    }
    if (v.age === 40 && !v.dealt) {
      v.dealt = true;
      for (const e of state.entities) {
        if (!isEnemyEntity(e)) continue;
        hurtEntity(e, s.dmg, e.x + e.w / 2, e.y + e.h / 2);
        spawnP(e.x + e.w / 2, e.y + e.h / 2, s.core, 18, 'sparkle');
      }
      state.shake(14);
      SoundFX.playSweep(180, 1200, 'sine', 0.8, 0.3);
    }
    if (v.age % 2 === 0) {
      spawnP(Math.random() * state.W, Math.random() * state.H, Math.random() > .5 ? s.color : s.core, 1, 'sparkle');
    }
    if (v.age > 90) v.done = true;
  },
  // Persistent ticker: counts down each sleeper's drowsy timer and drives the
  // z-z-z overlay. Self-removes once no enemy is asleep.
  dream_status: (v) => {
    let any = false;
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      if ((e._dreamSleep || 0) > 0) {
        e._dreamSleep -= 1;
        any = true;
        if (e._dreamSleep % 22 === 0) spawnP(e.x + e.w / 2, e.y - 8, PAL.c2, 1, 'sparkle');
      }
    }
    if (!any && v.age > 4) v.done = true;
  },
};

// ── VFX draw ──────────────────────────────────────────────────────────────────
export const VFX_DRAW = {
  dream_slumber: (v, X) => {
    const s = v.spell;
    const prog = v.age / 46;
    X.save();
    X.globalAlpha = 0.5 * (1 - prog);
    const grad = X.createRadialGradient(v.cx, v.cy, 4, v.cx, v.cy, s.sleepR);
    grad.addColorStop(0, s.core + 'aa'); grad.addColorStop(0.6, s.color + '55'); grad.addColorStop(1, 'transparent');
    X.fillStyle = grad;
    X.beginPath(); X.arc(v.cx, v.cy, s.sleepR * (0.4 + prog * 0.7), 0, Math.PI * 2); X.fill();
    // floating Z's
    X.globalAlpha = (1 - prog);
    X.fillStyle = s.core; X.font = 'bold 16px serif';
    for (let i = 0; i < 3; i++) {
      const zy = v.cy - 20 - i * 14 - (v.age % 24); X.globalAlpha = (1 - prog) * (1 - i * 0.3);
      X.fillText('z', v.cx + 10 + i * 8 + Math.sin(v.age * 0.1 + i) * 4, zy);
    }
    X.restore(); X.globalAlpha = 1;
  },
  dream_nightmare: (v, X) => {
    const s = v.spell;
    const prog = v.age / s.nightmareDur;
    X.save();
    X.globalAlpha = 0.55 * (1 - prog);
    const grad = X.createRadialGradient(v.cx, v.cy, 6, v.cx, v.cy, s.nightmareR);
    grad.addColorStop(0, (s.dark || PAL.dark) + 'cc'); grad.addColorStop(0.55, s.color + '66'); grad.addColorStop(1, 'transparent');
    X.fillStyle = grad;
    const wob = s.nightmareR * (0.85 + Math.sin(v.age * 0.18) * 0.12);
    X.beginPath(); X.arc(v.cx, v.cy, wob, 0, Math.PI * 2); X.fill();
    X.strokeStyle = s.c2; X.globalAlpha = 0.4 * (1 - prog); X.lineWidth = 1.5;
    X.beginPath(); X.arc(v.cx, v.cy, wob, 0, Math.PI * 2); X.stroke();
    X.restore(); X.globalAlpha = 1;
  },
  dream_cage: (v, X) => {
    const s = v.spell;
    const cx = v.cx, cy = v.cy, R = s.cageR;
    X.save();
    const arming = v.state === 0;
    X.globalAlpha = arming ? 0.35 + Math.sin(v.age * 0.2) * 0.15 : 0.85;
    X.strokeStyle = s.core; X.lineWidth = arming ? 1.5 : 2.5;
    // vertical bars of light
    const bars = 7;
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2 + v.age * 0.02;
      const bx = cx + Math.cos(a) * R;
      X.beginPath(); X.moveTo(bx, cy - R * 0.8); X.lineTo(bx, cy + R * 0.8); X.stroke();
    }
    X.strokeStyle = s.c2; X.globalAlpha *= 0.7;
    X.beginPath(); X.ellipse(cx, cy - R * 0.8, R, R * 0.28, 0, 0, Math.PI * 2); X.stroke();
    X.beginPath(); X.ellipse(cx, cy + R * 0.8, R, R * 0.28, 0, 0, Math.PI * 2); X.stroke();
    X.restore(); X.globalAlpha = 1;
  },
  dream_decoy: (v, X) => {
    const s = v.spell;
    const flicker = 0.35 + Math.random() * 0.35;
    X.save();
    X.globalAlpha = flicker;
    X.fillStyle = s.color;
    const x = v.x + 7, y = v.y + 8;
    X.beginPath(); X.arc(x, y - 6, 4, 0, Math.PI * 2); X.fill();
    X.fillRect(x - 3, y - 2, 6, 10); X.fillRect(x - 6, y + 1, 3, 7); X.fillRect(x + 3, y + 1, 3, 7);
    X.strokeStyle = s.c2; X.globalAlpha = flicker * 0.5; X.lineWidth = 1;
    X.beginPath(); X.arc(x, y + 12, 11, 0, Math.PI * 2); X.stroke();
    X.restore(); X.globalAlpha = 1;
  },
  dream_swarm: (v, X) => {
    const s = v.spell;
    const pal = { color: s.color, c2: s.c2, core: s.core };
    for (const m of v.motes) {
      if (m.x == null) continue; // not positioned yet (first frame before update)
      drawFairy(X, m.x, m.y, v.age + (m.zapCd || 0) * 3, pal, 0.95);
    }
  },
  dream_ray: (v, X) => {
    const s = v.spell;
    if (v.hx == null) return;
    const steps = 8; const segs = [];
    for (let j = 0; j <= steps; j++) {
      segs.push({ x: v.ox + (v.hx - v.ox) * (j / steps) + (j > 0 && j < steps ? (Math.random() - .5) * 6 : 0), y: v.oy + (v.hy - v.oy) * (j / steps) + (j > 0 && j < steps ? (Math.random() - .5) * 6 : 0) });
    }
    X.save();
    X.strokeStyle = s.color; X.lineWidth = s.rayW + 5; X.globalAlpha = 0.3;
    X.beginPath(); segs.forEach((p, i) => i === 0 ? X.moveTo(p.x, p.y) : X.lineTo(p.x, p.y)); X.stroke();
    X.strokeStyle = s.core; X.lineWidth = s.rayW; X.globalAlpha = 0.85;
    X.beginPath(); segs.forEach((p, i) => i === 0 ? X.moveTo(p.x, p.y) : X.lineTo(p.x, p.y)); X.stroke();
    X.restore(); X.globalAlpha = 1;
  },
  dream_mirage: (v, X) => {
    const s = v.spell;
    X.save();
    v.echoes.forEach((e, i) => {
      const a = Math.max(0, 0.5 - v.age / 44) * (1 - i / (v.echoes.length + 1));
      X.globalAlpha = a; X.fillStyle = s.color;
      X.beginPath(); X.arc(e.x + 7, e.y + 2, 4, 0, Math.PI * 2); X.fill();
      X.fillRect(e.x + 4, e.y + 6, 6, 10);
    });
    X.restore(); X.globalAlpha = 1;
  },
  dream_scape: (v, X) => {
    const s = v.spell;
    const prog = v.age / 90;
    X.save();
    // oneiric vignette wash
    X.globalAlpha = Math.sin(prog * Math.PI) * 0.4;
    const grad = X.createRadialGradient(state.W / 2, state.H / 2, 40, state.W / 2, state.H / 2, state.W * 0.75);
    grad.addColorStop(0, s.core + '55'); grad.addColorStop(0.5, s.color + '66'); grad.addColorStop(1, '#1a1040ee');
    X.fillStyle = grad; X.fillRect(0, 0, state.W, state.H);
    // collapsing rings
    X.globalAlpha = Math.sin(prog * Math.PI) * 0.7; X.strokeStyle = s.c2; X.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const rr = (state.W * 0.7) * (1 - ((v.age * 0.012 + i * 0.33) % 1));
      X.beginPath(); X.arc(state.W / 2, state.H / 2, rr, 0, Math.PI * 2); X.stroke();
    }
    X.restore(); X.globalAlpha = 1;
  },
  dream_status: (v, X) => {
    for (const e of state.entities) {
      if (!isEnemyEntity(e) || (e._dreamSleep || 0) <= 0) continue;
      drawSleepZs(X, e.x + e.w / 2, e.y, v.age + (e._dreamSleep || 0), PAL);
    }
  },
};
