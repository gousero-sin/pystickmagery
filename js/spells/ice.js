// ice.js — Ice School: frio absoluto, cristal e nevasca.
// Herda Ice Lance / Frost Nova / Chain Frost / Permafrost / Glacier Path /
// Absolute Zero da water.js (handlers ficam lá; o registry funde os mapas
// globalmente) e adiciona 4 spells próprios.
import { state, H } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { ICE_SPELL_DEFS } from './water.js?v=9';
import { surfaceYAt } from './fx-helpers.js?v=1';

const GROUND_Y = H - 20;

// ── Visual helpers ─────────────────────────────────────────────────────────
function glow(X, x, y, r, c1, c2, alpha = 1) {
  X.save();
  X.globalCompositeOperation = 'lighter';
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, 'transparent');
  X.fillStyle = g; X.globalAlpha = alpha;
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fill();
  X.restore(); X.globalAlpha = 1;
}

function crystalShard(X, x, y, len, rot, c1, c2, alpha = 1) {
  X.save();
  X.translate(x, y); X.rotate(rot); X.globalAlpha = alpha;
  const g = X.createLinearGradient(0, -len, 0, len * .4);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.4, c1); g.addColorStop(1, c2);
  X.fillStyle = g;
  X.beginPath();
  X.moveTo(0, -len); X.lineTo(len * .28, 0); X.lineTo(0, len * .4); X.lineTo(-len * .28, 0);
  X.closePath(); X.fill();
  X.strokeStyle = 'rgba(255,255,255,.65)'; X.lineWidth = .8;
  X.beginPath(); X.moveTo(0, -len); X.lineTo(0, len * .4); X.stroke();
  X.restore(); X.globalAlpha = 1;
}

function snowBurst(x, y, n, force = 2) {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      x, y, vx: (Math.random() - .5) * force, vy: -Math.random() * force - .4,
      life: 28 + Math.random() * 20 | 0, ml: 48,
      color: Math.random() > .4 ? '#eaffff' : '#9fe4ff', size: 1 + Math.random() * 1.8,
      grav: .04, type: 'sparkle',
    });
  }
}

// ── Spell Definitions ──────────────────────────────────────────────────────
export const SPELL_DEFS = [
  ...ICE_SPELL_DEFS.filter((s) => s.name !== 'Permafrost'),
  { name: 'Cryoseism', icon: '🥶', key: '4', color: '#8ad4f4', c2: '#c8eeff', core: '#ffffff', speed: 0, dmg: 18, mana: 26, cd: 880, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isCryoseism: true, seismRange: 200, desc: 'Choque de geada corre pelo chão nos dois sentidos congelando tudo' },
  { name: 'Hail Volley', icon: '🌨️', key: '5', color: '#7ad4ff', c2: '#bdeeff', core: '#ffffff', speed: 0, dmg: 12, mana: 18, cd: 520, r: 4, grav: 0, drag: 1, bounce: 0, exR: 24, exF: 4, trail: 'hail', isHailVolley: true, hailCount: 8, hailSpan: 110, desc: 'Salva de granizo cristalino despenca sobre o alvo' },
  { name: 'Blizzard', icon: '❄️', key: '6', color: '#9fd8ff', c2: '#d6f2ff', core: '#ffffff', speed: 0, dmg: 3, mana: 30, cd: 1200, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isBlizzard: true, blizDur: 280, blizR: 130, desc: 'Nevasca lateral que congela gradualmente quem insiste em ficar' },
  { name: 'Frost Armor', icon: '🛡️', key: '7', color: '#8fe0ff', c2: '#cdf4ff', core: '#ffffff', speed: 0, dmg: 10, mana: 26, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isFrostArmor: true, armorDur: 360, armorShards: 6, desc: 'Cristais orbitam o mago — congelam quem encostar e estilhaçam no fim' },
  { name: 'Glacial Maw', icon: '🦈', key: '8', color: '#5ec4ef', c2: '#aae8ff', core: '#ffffff', speed: 0, dmg: 36, mana: 34, cd: 1100, r: 0, grav: 0, drag: 1, bounce: 0, trail: 'ice', isGlacialMaw: true, mawW: 110, desc: 'Mandíbula de geleira fecha-se do chão e do teto sobre o alvo' },
];

// ── Fire Handlers ──────────────────────────────────────────────────────────
export const FIRE_HANDLERS = {
  isCryoseism: (s, ox, oy) => {
    const p = state.player;
    const gy = surfaceYAt(p.x + p.w / 2, p.y + p.h);
    state.vfxSequences.push({
      type: 'ice_seism', state: 0, age: 0, spell: s,
      cx: p.x + p.w / 2, gy, reach: 0, hitSet: new Set(),
    });
    state.shake(3);
    SoundFX.playNoise(0.6, 0.4, 320, 'lowpass');
    SoundFX.playSweep(200, 700, 'triangle', 0.4, 0.2);
    return true;
  },
  isHailVolley: (s, ox, oy, tx, ty) => {
    state.vfxSequences.push({ type: 'ice_hail', state: 0, age: 0, spell: s, tx, dropped: 0 });
    SoundFX.playSweep(700, 1400, 'sine', 0.25, 0.14);
    return true;
  },
  isBlizzard: (s, ox, oy, tx, ty) => {
    state.vfxSequences.push({
      type: 'ice_blizzard', state: 0, age: 0, spell: s, cx: tx, cy: Math.min(ty, GROUND_Y - 40),
      flakes: Array.from({ length: 56 }, () => ({
        ox: Math.random(), oy: Math.random(), sp: .5 + Math.random() * 1.4, sz: .8 + Math.random() * 2, ph: Math.random() * 9,
      })),
      chill: new Map(),
    });
    SoundFX.playNoise(1.1, 0.3, 1400, 'highpass');
    return true;
  },
  isFrostArmor: (s) => {
    const shards = Array.from({ length: s.armorShards }, (_, i) => ({
      a: (i / s.armorShards) * Math.PI * 2, len: 9 + Math.random() * 4, hitCd: 0,
    }));
    state.vfxSequences.push({ type: 'ice_armor', state: 0, age: 0, spell: s, shards });
    snowBurst(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 14, 3);
    SoundFX.playSweep(300, 900, 'triangle', 0.3, 0.2);
    return true;
  },
  isGlacialMaw: (s, ox, oy, tx, ty) => {
    state.vfxSequences.push({
      type: 'ice_maw', state: 0, age: 0, spell: s, tx, ty: Math.min(ty, GROUND_Y - 30),
      teethTop: Array.from({ length: 6 }, (_, i) => ({ o: i / 5 - .5, l: 26 + Math.random() * 16 })),
      teethBot: Array.from({ length: 6 }, (_, i) => ({ o: i / 5 - .5, l: 26 + Math.random() * 16 })),
      hitSet: new Set(),
    });
    SoundFX.playSweep(500, 120, 'sawtooth', 0.4, 0.3);
    return true;
  },
};

// ── Trail emitters / projectile bodies ─────────────────────────────────────
export const TRAIL_EMITTERS = {
  hail(p) {
    if (Math.random() < .6) {
      state.particles.push({
        x: p.x, y: p.y, vx: -p.vx * .04, vy: -p.vy * .04,
        life: 14, ml: 14, color: '#d6f2ff', size: 1 + Math.random(), grav: 0, type: 'sparkle',
      });
    }
  },
};

export const PROJ_DRAW = {
  hail(p, s, X) {
    glow(X, p.x, p.y, 12, 'rgba(255,255,255,.6)', 'rgba(122,212,255,.3)', .7);
    crystalShard(X, p.x, p.y, 8, Math.atan2(p.vy, p.vx) + Math.PI / 2, s.color, s.c2);
  },
};

// ── VFX update ─────────────────────────────────────────────────────────────
export const VFX_UPDATE = {
  ice_seism(v) {
    const s = v.spell;
    v.reach += 4.6;
    for (const e of state.entities) {
      if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
      const dx = Math.abs(e.x + e.w / 2 - v.cx);
      if (dx < v.reach && dx > v.reach - 14 && Math.abs(e.y + e.h - v.gy) < 36) {
        v.hitSet.add(e);
        hurtEntity(e, s.dmg, e.x + e.w / 2, v.gy);
        state.frozenEntities.set(e, 110);
        snowBurst(e.x + e.w / 2, e.y + e.h / 2, 10, 3.6);
        SoundFX.playTone(900, 'sine', 0.1, 0.16);
      }
    }
    if (v.age % 3 === 0) {
      snowBurst(v.cx + v.reach, v.gy - 2, 1, 1.6);
      snowBurst(v.cx - v.reach, v.gy - 2, 1, 1.6);
    }
    if (v.reach > s.seismRange) v.done = true;
  },
  ice_hail(v) {
    const s = v.spell;
    if (v.age % 3 === 0 && v.dropped < s.hailCount) {
      v.dropped++;
      const hx = v.tx + (Math.random() - .5) * s.hailSpan;
      state.projectiles.push(createPlayerProjectile({
        x: hx, y: -8, vx: (Math.random() - .5) * 1.2, vy: 9 + Math.random() * 3,
        spell: s, life: 140, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
      }));
      spawnP(hx, 0, s.core, 2, 'sparkle');
    }
    if (v.dropped >= s.hailCount && v.age > 40) v.done = true;
  },
  ice_blizzard(v) {
    const s = v.spell;
    for (const e of state.entities) {
      if (!isEnemyEntity(e)) continue;
      const d = Math.hypot(e.x + e.w / 2 - v.cx, e.y + e.h / 2 - v.cy);
      if (d < s.blizR) {
        e.vx *= .96;
        const c = (v.chill.get(e) || 0) + 1;
        v.chill.set(e, c);
        if (v.age % 20 === 0) hurtEntity(e, s.dmg, e.x, e.y);
        // Congelamento progressivo: quem fica ~1.6s dentro congela.
        if (c === 100) {
          state.frozenEntities.set(e, 130);
          spawnP(e.x + e.w / 2, e.y + e.h / 2, '#ffffff', 12, 'burst');
          SoundFX.playTone(980, 'sine', 0.12, 0.2);
        }
      } else if (v.chill.has(e)) {
        v.chill.set(e, Math.max(0, v.chill.get(e) - 2));
      }
    }
    if (v.age % 6 === 0) snowBurst(v.cx + (Math.random() - .5) * s.blizR * 1.6, v.cy - s.blizR * .5, 1, 1);
    if (v.age > s.blizDur) v.done = true;
  },
  ice_armor(v) {
    const s = v.spell;
    const p = state.player;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (const sh of v.shards) {
      sh.a += 0.085;
      if (sh.hitCd > 0) sh.hitCd--;
      const sx = cx + Math.cos(sh.a) * 26, sy = cy + Math.sin(sh.a) * 22;
      if (sh.hitCd === 0) {
        for (const e of state.entities) {
          if (!isEnemyEntity(e)) continue;
          if (Math.hypot(e.x + e.w / 2 - sx, e.y + e.h / 2 - sy) < 16) {
            sh.hitCd = 26;
            hurtEntity(e, s.dmg, sx, sy);
            state.frozenEntities.set(e, 60);
            snowBurst(sx, sy, 6, 3);
            SoundFX.playTone(760, 'triangle', 0.1, 0.16);
          }
        }
      }
    }
    if (v.age === s.armorDur) {
      // Estilhaço final: cada cristal vira projétil radial.
      for (const sh of v.shards) {
        state.projectiles.push(createPlayerProjectile({
          x: cx + Math.cos(sh.a) * 26, y: cy + Math.sin(sh.a) * 22,
          vx: Math.cos(sh.a) * 7, vy: Math.sin(sh.a) * 7,
          spell: { ...s, trail: 'hail', dmg: 14, exR: 18, exF: 3, r: 3, piercing: false },
          life: 80, age: 0, trail: [], hitList: [], bounces: 0, chains: 0,
        }));
      }
      snowBurst(cx, cy, 18, 4);
      SoundFX.playNoise(0.3, 0.4, 2400, 'highpass');
      v.done = true;
    }
  },
  ice_maw(v) {
    const s = v.spell;
    if (v.age === 14) {
      state.shake(4);
      SoundFX.playNoise(0.35, 0.5, 400, 'lowpass');
      for (const e of state.entities) {
        if (!isEnemyEntity(e) || v.hitSet.has(e)) continue;
        if (Math.abs(e.x + e.w / 2 - v.tx) < s.mawW / 2 && Math.abs(e.y + e.h / 2 - v.ty) < 70) {
          v.hitSet.add(e);
          hurtEntity(e, s.dmg, v.tx, v.ty);
          state.frozenEntities.set(e, 100);
          snowBurst(e.x + e.w / 2, e.y + e.h / 2, 10, 4);
        }
      }
      state.dynamicLights.push({ x: v.tx, y: v.ty, r: 110, color: s.core, int: 1.8, life: 14, ml: 14 });
    }
    if (v.age > 60) v.done = true;
  },
};

// ── VFX draw ───────────────────────────────────────────────────────────────
export const VFX_DRAW = {
  ice_seism(v, X) {
    const s = v.spell;
    const fade = Math.max(0, 1 - v.reach / s.seismRange * .7);
    for (const dir of [-1, 1]) {
      const hx = v.cx + dir * v.reach;
      glow(X, hx, v.gy - 4, 24, 'rgba(255,255,255,.7)', 'rgba(138,212,244,.3)', fade + .3);
      // Rima de gelo deixada para trás.
      X.save(); X.globalAlpha = .55;
      const g = X.createLinearGradient(v.cx, v.gy, hx, v.gy);
      g.addColorStop(0, 'rgba(200,238,255,.1)'); g.addColorStop(1, s.c2);
      X.strokeStyle = g; X.lineWidth = 3; X.lineCap = 'round';
      X.beginPath(); X.moveTo(v.cx, v.gy - 1); X.lineTo(hx, v.gy - 1); X.stroke();
      X.restore(); X.globalAlpha = 1;
      // Cristais brotando na frente de onda.
      for (let i = 0; i < 3; i++) {
        crystalShard(X, hx - dir * i * 7, v.gy - 2, 9 - i * 2.4, (Math.random() - .5) * .2, s.color, s.c2, (1 - i * .26));
      }
    }
  },
  ice_hail(v, X) {
    const s = v.spell;
    // Aviso suave: cintilação no céu sobre o alvo.
    glow(X, v.tx, 16, 50, 'rgba(255,255,255,.35)', 'rgba(122,212,255,.15)', Math.max(0, 1 - v.age / 30));
  },
  ice_blizzard(v, X) {
    const s = v.spell;
    const fade = Math.min(1, v.age / 18) * Math.min(1, (s.blizDur - v.age) / 26);
    if (fade <= 0) return;
    X.save();
    // Domo de frio.
    glow(X, v.cx, v.cy, s.blizR, 'rgba(214,242,255,.22)', 'rgba(159,216,255,.10)', fade);
    X.globalAlpha = .8 * fade;
    X.strokeStyle = '#eaffff'; X.lineCap = 'round';
    for (const fk of v.flakes) {
      const fx = v.cx - s.blizR + ((fk.ox + v.age * .011 * fk.sp) % 1) * s.blizR * 2;
      const fy = v.cy - s.blizR * .8 + ((fk.oy + v.age * .016 * fk.sp) % 1) * s.blizR * 1.5 + Math.sin(v.age * .1 + fk.ph) * 5;
      const d = Math.hypot(fx - v.cx, fy - v.cy);
      if (d > s.blizR) continue;
      X.globalAlpha = (.3 + fk.sz * .2) * fade * (1 - d / s.blizR);
      X.lineWidth = fk.sz;
      X.beginPath(); X.moveTo(fx, fy); X.lineTo(fx - 6 * fk.sp, fy - 3); X.stroke();
    }
    X.restore(); X.globalAlpha = 1;
  },
  ice_armor(v, X) {
    const s = v.spell;
    const p = state.player;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const fade = Math.min(1, v.age / 12) * Math.min(1, (s.armorDur - v.age) / 18 + .001);
    glow(X, cx, cy, 36, 'rgba(205,244,255,.25)', 'rgba(143,224,255,.1)', fade);
    for (const sh of v.shards) {
      const sx = cx + Math.cos(sh.a) * 26, sy = cy + Math.sin(sh.a) * 22;
      crystalShard(X, sx, sy, sh.len, sh.a + Math.PI / 2, s.color, s.c2, fade);
      if (sh.hitCd > 18) glow(X, sx, sy, 18, 'rgba(255,255,255,.7)', 'transparent', (sh.hitCd - 18) / 8);
    }
  },
  ice_maw(v, X) {
    const s = v.spell;
    const closeT = Math.min(1, v.age / 14);
    const fade = v.age > 40 ? Math.max(0, 1 - (v.age - 40) / 20) : 1;
    if (fade <= 0) return;
    X.save();
    glow(X, v.tx, v.ty, 80 * closeT, 'rgba(255,255,255,.3)', 'rgba(94,196,239,.15)', fade);
    const gapTop = 76 * (1 - closeT), gapBot = 76 * (1 - closeT);
    for (const t of v.teethTop) {
      crystalShard(X, v.tx + t.o * s.mawW, v.ty - gapTop - t.l * .5, t.l, Math.PI + t.o * .5, s.color, s.c2, fade);
    }
    for (const t of v.teethBot) {
      crystalShard(X, v.tx + t.o * s.mawW, v.ty + gapBot + t.l * .5, t.l, t.o * -.5, s.color, s.c2, fade);
    }
    if (closeT >= 1 && v.age < 26) {
      // Clarão do impacto da mordida.
      glow(X, v.tx, v.ty, 90, 'rgba(255,255,255,.8)', 'rgba(170,232,255,.3)', (26 - v.age) / 12);
    }
    X.restore();
  },
};

export const PROJ_HOOKS = {
  hail: {
    onLand(p, s) {
      snowBurst(p.x, p.y, 8, 3);
      state.dynamicLights.push({ x: p.x, y: p.y, r: 40, color: '#bdeeff', int: 1.2, life: 8, ml: 8 });
      return false;
    },
  },
};
