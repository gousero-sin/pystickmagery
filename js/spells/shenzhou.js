// shenzhou.js — Shenzhou School: Magia Cinemática das Lendas Chinesas
//   Dragões colossais, fênix em chamas, mandalas cósmicos — escala épica.
//   Family: Spirit
import { state } from '../core/state.js?v=7';
import { spawnP, hurtEntity, isEnemyEntity, nearestEnemyEntity } from '../core/utils.js?v=8';
import { createPlayerProjectile } from '../core/projectiles.js?v=1';
import { createAlly } from '../core/allies.js?v=1';
import { SoundFX } from '../core/sounds.js?v=7';
import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';
import {
  SPELL_DEFS as NEW_SPELL_DEFS,
  FIRE_HANDLERS as NEW_FIRE_HANDLERS,
  PROJ_HOOKS as NEW_PROJ_HOOKS,
  TRAIL_EMITTERS as NEW_TRAIL_EMITTERS,
  VFX_UPDATE as NEW_VFX_UPDATE,
  VFX_DRAW as NEW_VFX_DRAW,
} from './shenzhou-new.js?v=1';

const SZ = {
  flame:   '#ee3311',
  gold:    '#ffbb33',
  jade:    '#2eb872',
  phoenix: '#ff5500',
  trigram: '#dda833',
  moon:    '#b8bbff',
  thunder: '#ffdd11',
  star:    '#88aaff',
  snake:   '#e0d5ff',
  decree:  '#ffcc44',
  c2:      '#ffeebb',
  core:    '#fff8e7',
  void:    '#14081e',
  crimson: '#cc1100',
  ember:   '#ff9944',
};

function rmVfx(v) { const i = state.vfxSequences.indexOf(v); if (i !== -1) state.vfxSequences.splice(i, 1); }

function enemiesInRadius(x, y, r) {
  const out = [];
  for (const e of state.entities) if (isEnemyEntity(e) && Math.hypot(e.x+e.w/2-x, e.y+e.h/2-y) < r) out.push(e);
  return out;
}

function spiritBlast(x, y, r, dmg, force = 0, color = SZ.gold) {
  for (const e of enemiesInRadius(x, y, r)) {
    const ex = e.x+e.w/2, ey = e.y+e.h/2, d = Math.hypot(ex-x, ey-y)||1, pct = 1-d/r;
    hurtEntity(e, Math.max(1, Math.floor(dmg*pct)), x, y);
    if (force) { e.vx += (ex-x)/d*force*pct/(e.mass||1); e.vy += (ey-y)/d*force*pct/(e.mass||1)-1.5; }
  }
}

function playerCenter() { const p = state.player; return { x: p.x+p.w/2, y: p.y+p.h/2 }; }

function flashScreen(color, alpha, life) {
  state.dynamicLights.push({ x: state.W/2, y: state.H/2, r: state.W, color, int: alpha*10, life, ml: life });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPELL_DEFS
// ═══════════════════════════════════════════════════════════════════════════════
const LEGACY_SPELL_DEFS = [
  // 1. DRAGON BREATH — VFX puro, sem projétil. Dragão colossal cospe fogo em cone.
  {
    name: 'Dragon Breath', icon: '🐉', key: '1', category: 'Common',
    color: SZ.flame, c2: SZ.ember, core: '#fff0cc',
    speed: 0, dmg: 28, mana: 22, cd: 900, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isDragonBreath: true, breathRange: 310, breathArc: 0.55, breathDur: 38,
    desc: 'Um dragão colossal irrompe do portal e cospe fogo em cone, incinerando tudo à frente.',
  },
  // 2. JADE SENTINEL — Guerreiro de jade colossal
  {
    name: 'Jade Sentinel', icon: '🗿', key: '2', category: 'Summon',
    color: SZ.jade, c2: '#7ff5aa', core: '#e0ffe0',
    speed: 0, dmg: 18, mana: 38, cd: 2800, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isJadeSentinel: true, sentinelDur: 500,
    desc: 'Invoca um guerreiro de jade de 3 metros que golpeia o chão e devasta em área.',
  },
  // 3. PHOENIX DASH — Voo da fênix com asas colossais
  {
    name: 'Phoenix Dash', icon: '🔥', key: '3', category: 'Dash',
    color: SZ.phoenix, c2: '#ffcc88', core: '#fff4e0',
    speed: 0, dmg: 0, mana: 24, cd: 950, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_flame', isPhoenixDash: true, dashRange: 200, dashWind: 12, dashTravel: 8, dashPush: 7,
    desc: 'Incendeia-se em asas de fênix de 15 metros, voa em arco flamejante e renasce em explosão solar.',
  },
  // 4. EIGHT TRIGRAMS — Mandala cósmico
  {
    name: 'Eight Trigrams', icon: '☯️', key: '4', category: 'Trap',
    color: SZ.trigram, c2: '#ffe088', core: '#fffbe0',
    speed: 0, dmg: 8, mana: 30, cd: 1900, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isEightTrigrams: true, trigramR: 110, trigramDur: 320,
    desc: 'Mandala celestial dos Oito Trigramas: círculo de 220px que pulsa, queima e distorce o tecido.',
  },
  // 5. MONKEY STAFF — Bastão Dourado (Hold)
  createHoldSpell({
    name: 'Monkey Staff', icon: '🐵', key: '5',
    color: SZ.gold, c2: '#ffdd77', core: '#ffffe0',
    mana: 26, cd: 1200, dmg: 0,
    holdStyle: 'shenzhou', holdProfile: 'arcane_frame',
    holdR: 100, holdDrain: 0.2, holdPush: 0.55,
    releaseR: 90, releaseDmg: 26,
    desc: 'Ruyi Jingu Bang: o Bastão Dourado se estende, empurrando tudo em 100px.',
  }),
  // 6. MOONLIT MIRROR — Espelho lunar massivo
  {
    name: 'Moonlit Mirror', icon: '🌙', key: '6', category: 'Ward',
    color: SZ.moon, c2: '#dddfff', core: '#f8f8ff',
    speed: 0, dmg: 10, mana: 34, cd: 3800, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isMoonlitMirror: true, wardDur: 220, wardR: 100,
    desc: 'Lua cheia de 200px envolve o conjurador, absorve dano e explode em raios prateados.',
  },
  // 7. THUNDER TALISMAN — Relâmpago celestial
  {
    name: 'Thunder Talisman', icon: '📜', key: '7', category: 'Cast',
    color: SZ.thunder, c2: '#ffff88', core: '#ffffff',
    speed: 0, dmg: 50, mana: 28, cd: 1400, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isThunderTalisman: true, talismanR: 64,
    desc: 'Talismã voa ao alvo, queima no ar e um raio de 140px de altura desaba com flash da tela.',
  },
  // 8. CELESTIAL RIVER — Rio de estrelas (Manifest)
  createManifestSpell({
    name: 'Celestial River', icon: '🌌', key: '8',
    color: SZ.star, c2: '#bbccff', core: '#f0f4ff',
    manifestStyle: 'shenzhou', manifestEffect: 'wind_lift', manifestProfile: 'current', manifestGlyph: '~',
    manifestDuration: 760, manifestSolid: false,
    mana: 32, cd: 1500, manifestArc: 28, manifestThickness: 20,
    desc: 'Manifesta um rio celestial de constelações que flui em luz azul e afasta tudo.',
  }),
  // 9. WHITE SNAKE COIL — Serpente gigante
  {
    name: 'White Snake Coil', icon: '🐍', key: '9', category: 'Bind',
    color: SZ.snake, c2: '#f0e8ff', core: '#ffffff',
    speed: 6, dmg: 7, mana: 26, cd: 1700, r: 7, grav: 0.01, drag: 0.99, bounce: 0,
    trail: 'shenzhou_snake', isWhiteSnake: true, snareDur: 210,
    desc: 'Serpente Bai Suzhen de 60px de diâmetro envolve e paralisa o primeiro inimigo.',
  },
  // 10. HEAVENLY DECREE — Dragão celestial colossal (Ultimate)
  {
    name: 'Heavenly Decree', icon: '👑', key: '0', category: 'Ultimate',
    color: SZ.decree, c2: '#ffeeaa', core: '#ffffff',
    speed: 0, dmg: 35, mana: 100, cd: 14000, r: 0, grav: 0, drag: 1, bounce: 0,
    trail: 'shenzhou_light', isHeavenlyDecree: true,
    desc: 'O dragão celestial dourado desce em espiral de 500px, devora o campo e explode em luz divina (Ultimate).',
  },
];

const REMOVED_SPELLS = new Set([
  'Eight Trigrams',
  'Moonlit Mirror',
  'Thunder Talisman',
  'Celestial River',
  'White Snake Coil',
]);

export const SPELL_DEFS = [
  ...LEGACY_SPELL_DEFS.filter((spell) => !REMOVED_SPELLS.has(spell.name)),
  ...NEW_SPELL_DEFS,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FIRE_HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
export const FIRE_HANDLERS = {
  ...HOLD_FIRE_HANDLERS,
  ...MANIFEST_FIRE_HANDLERS,
  ...NEW_FIRE_HANDLERS,

  isDragonBreath(s, ox, oy, tx, ty) {
    const pc = playerCenter();
    const angle = Math.atan2(ty-pc.y, tx-pc.x);
    state.vfxSequences.push({
      type: 'shenzhou_dragon_breath', state: 0, age: 0,
      cx: pc.x, cy: pc.y, angle, spell: s,
    });
    SoundFX.playSweep(120, 60, 'sawtooth', 0.7, 0.3);
    SoundFX.playNoise(0.6, 0.3, 100, 'lowpass');
    state.shake(14);
    flashScreen(s.flame, 0.5, 6);
    return true;
  },

  isJadeSentinel(s, ox, oy, tx, ty) {
    const pc = playerCenter();
    state.vfxSequences.push({
      type: 'shenzhou_jade_sentinel', state: 0, age: 0,
      cx: pc.x+50, cy: pc.y-10, spell: s, ally: null, slamCd: 0,
    });
    SoundFX.playTone(520, 'triangle', 0.28, 0.32);
    SoundFX.playTone(780, 'triangle', 0.2, 0.32);
    SoundFX.playTone(1040, 'sine', 0.15, 0.36);
    spawnP(pc.x, pc.y, s.color, 30, 'burst');
    state.shake(6);
    flashScreen(s.c2, 0.3, 8);
    return true;
  },

  isPhoenixDash(s, ox, oy, tx, ty) {
    const p = state.player;
    const px = p.x+p.w/2, py = p.y+p.h/2;
    const dx = tx-px, dy = ty-py, len = Math.hypot(dx, dy)||1;
    const dist = Math.min(s.dashRange, len);
    const nx = Math.max(20, Math.min(state.W-20, px+dx/len*dist));
    const ny = Math.max(28, Math.min(state.H-30, py+dy/len*dist));
    state.vfxSequences.push({
      type: 'shenzhou_phoenix_dash', state: 0, age: 0,
      fx: px, fy: py, tx: nx, ty: ny, spell: s,
      angle: Math.atan2(ny-py, nx-px), trail: [],
    });
    SoundFX.playSweep(200, 1200, 'sine', 0.5, 0.35);
    SoundFX.playTone(1600, 'sine', 0.25, 0.25);
    flashScreen(s.color, 0.4, 5);
    return true;
  },

  isEightTrigrams(s, ox, oy, tx, ty) {
    state.vfxSequences.push({ type: 'shenzhou_eight_trigrams', state: 0, age: 0, cx: tx, cy: ty, spell: s });
    SoundFX.playTone(280, 'sine', 0.24, 0.4);
    SoundFX.playTone(560, 'sine', 0.16, 0.38);
    SoundFX.playTone(880, 'triangle', 0.1, 0.36);
    state.dynamicLights.push({ x: tx, y: ty, r: 150, color: s.color, int: 3.5, life: 28, ml: 28 });
    state.shake(6);
    return true;
  },

  isMoonlitMirror(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({
      type: 'shenzhou_moonlit_mirror', state: 0, age: 0,
      cx: p.x+p.w/2, cy: p.y+p.h/2, spell: s, prevInv: !!p.inv,
    });
    p.inv = true;
    SoundFX.playSweep(300, 1600, 'sine', 0.36, 0.4);
    SoundFX.playTone(1800, 'sine', 0.2, 0.35);
    spawnP(p.x+p.w/2, p.y+p.h/2, s.c2, 36, 'sparkle');
    flashScreen(s.color, 0.35, 10);
    return true;
  },

  isThunderTalisman(s, ox, oy, tx, ty) {
    const tgt = nearestEnemyEntity(tx, ty, 320);
    const cx = tgt ? tgt.x+tgt.w/2 : tx;
    const cy = tgt ? tgt.y+tgt.h/2 : ty;
    state.vfxSequences.push({
      type: 'shenzhou_thunder_talisman', state: 0, age: 0,
      cx, cy, startX: ox, startY: oy, spell: s,
      talismanX: ox, talismanY: oy-40,
    });
    SoundFX.playSweep(500, 2200, 'sawtooth', 0.35, 0.22);
    SoundFX.playTone(1200, 'square', 0.18, 0.18);
    spawnP(ox, oy-30, s.c2, 12, 'sparkle');
    return true;
  },

  isHeavenlyDecree(s, ox, oy, tx, ty) {
    const p = state.player;
    state.vfxSequences.push({
      type: 'shenzhou_heavenly_decree', state: 0, age: 0,
      cx: p.x+p.w/2, cy: p.y+p.h/2, spell: s,
      prevInv: !!p.inv, dragonBody: [], dragonAge: 0,
    });
    p.inv = true;
    SoundFX.playSweep(100, 30, 'triangle', 0.8, 0.8);
    SoundFX.playTone(60, 'sine', 0.5, 1.0);
    SoundFX.playTone(40, 'sine', 0.35, 1.2);
    spawnP(p.x+p.w/2, p.y+p.h/2, s.color, 50, 'burst');
    state.shake(22);
    flashScreen(s.color, 0.7, 16);
    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROJ_HOOKS
// ═══════════════════════════════════════════════════════════════════════════════
export const PROJ_HOOKS = {
  ...NEW_PROJ_HOOKS,
  isWhiteSnake: {
    onUpdate(p, s) {
      if (p.age%3===0) spawnP(p.x, p.y, SZ.snake, 1, 'trail');
      if (p.age%6===0) state.dynamicLights.push({ x: p.x, y: p.y, r: 50, color: SZ.snake, int: 0.8, life: 3, ml: 3 });
      return false;
    },
    onLand(p, s, hitPlat, hitEntity) {
      if (hitEntity && isEnemyEntity(hitEntity)) {
        state.frozenEntities.set(hitEntity, Math.max(state.frozenEntities.get(hitEntity)||0, s.snareDur));
        state.vfxSequences.push({
          type: 'shenzhou_snake_coil', state: 0, age: 0,
          target: hitEntity, cx: hitEntity.x+hitEntity.w/2, cy: hitEntity.y+hitEntity.h/2, spell: s,
        });
        SoundFX.playNoise(0.2, 0.34, 240, 'bandpass', 5);
        SoundFX.playTone(300, 'sine', 0.12, 0.24);
        spawnP(p.x, p.y, s.c2, 20, 'sparkle');
        flashScreen(s.color, 0.25, 4);
        return true;
      }
      spawnP(p.x, p.y, s.color, 10, 'sparkle');
      return false;
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRAIL_EMITTERS
// ═══════════════════════════════════════════════════════════════════════════════
export const TRAIL_EMITTERS = {
  ...NEW_TRAIL_EMITTERS,
  shenzhou_flame(p, s) {
    spawnP(p.x, p.y, Math.random()>0.5?SZ.phoenix:'#ffcc88', 1, 'trail');
    if (p.age%3===0) spawnP(p.x, p.y, '#ffffff', 1, 'sparkle');
  },
  shenzhou_light(p, s) {
    spawnP(p.x, p.y, Math.random()>0.5?SZ.gold:SZ.c2, 1, 'trail');
  },
  shenzhou_snake(p, s) {
    spawnP(p.x, p.y, Math.random()>0.5?SZ.snake:'#ddeeff', 1, 'trail');
    if (p.age%5===0) spawnP(p.x, p.y, '#f8f4ff', 1, 'sparkle');
  },
  shenzhou_dragon(p, s) {},
};

// ═══════════════════════════════════════════════════════════════════════════════
// VFX_UPDATE
// ═══════════════════════════════════════════════════════════════════════════════
export const VFX_UPDATE = {
  ...HOLD_VFX_UPDATE,
  ...MANIFEST_VFX_UPDATE,
  ...NEW_VFX_UPDATE,

  // ── DRAGON BREATH ──────────────────────────────────────────────────────────
  shenzhou_dragon_breath(v) {
    const s = v.spell;
    if (v.state===0) {
      // Wind-up: dragão irrompe
      if (v.age===1) { state.shake(16); }
      state.shake(Math.max(2, 10-v.age*0.5));
      // Partículas irrompendo do portal
      for (let i=0; i<4; i++) {
        const a = v.angle+(Math.random()-0.5)*0.6;
        const d = 30+Math.random()*60;
        state.particles.push({
          x: v.cx+Math.cos(a)*d, y: v.cy+Math.sin(a)*d-Math.random()*30,
          vx: Math.cos(a)*6, vy: Math.sin(a)*3-2,
          life: 18, ml: 18, color: Math.random()>0.5?s.color:SZ.ember,
          size: 3+Math.random()*4, grav: 0, type: 'ember',
        });
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 120+v.age*4, color: s.color, int: 2+v.age*0.06, life: 2, ml: 2 });
      if (v.age>18) { v.state=1; v.age=0; }
    } else if (v.state===1) {
      // Sopro de fogo em cone
      state.shake(2+Math.sin(v.age*0.3)*2);
      if (v.age%3===0) {
        // Dano em cone
        for (const e of state.entities) {
          if (!isEnemyEntity(e)) continue;
          const ex = e.x+e.w/2, ey = e.y+e.h/2;
          const dx = ex-v.cx, dy = ey-v.cy;
          const dist = Math.hypot(dx, dy);
          if (dist>s.breathRange) continue;
          const aToE = Math.atan2(dy, dx);
          let diff = aToE-v.angle;
          while (diff>Math.PI) diff-=Math.PI*2;
          while (diff<-Math.PI) diff+=Math.PI*2;
          if (Math.abs(diff)<s.breathArc) {
            hurtEntity(e, Math.floor(s.dmg*(1-dist/s.breathRange)*0.5), v.cx, v.cy);
            e.vx += Math.cos(v.angle)*3;
            e.vy -= 1.5;
            spawnP(ex, ey, SZ.ember, 5, 'burst');
          }
        }
      }
      // Partículas preenchendo o cone
      for (let i=0; i<8; i++) {
        const a = v.angle+(Math.random()-0.5)*s.breathArc*2;
        const d = 20+Math.random()*s.breathRange;
        state.particles.push({
          x: v.cx+Math.cos(a)*d, y: v.cy+Math.sin(a)*d,
          vx: Math.cos(a)*8, vy: Math.sin(a)*4-2,
          life: 14+Math.random()*16, ml: 30,
          color: Math.random()>0.5?SZ.flame:SZ.ember,
          size: 2+Math.random()*6, grav: -0.01, type: 'ember',
        });
      }
      state.dynamicLights.push({ x: v.cx+Math.cos(v.angle)*150, y: v.cy+Math.sin(v.angle)*100, r: 200, color: SZ.ember, int: 3, life: 2, ml: 2 });
      if (v.age>s.breathDur) { v.state=2; v.age=0; }
    } else {
      if (v.age>8) rmVfx(v);
    }
  },

  // ── JADE SENTINEL ──────────────────────────────────────────────────────────
  shenzhou_jade_sentinel(v) {
    const s = v.spell;
    if (v.state===0) {
      const ally = createAlly({
        x: v.cx-16, y: v.cy-28, w: 32, h: 56,
        mana: s.mana, threat: 70, type: 'ally-shenzhou-sentinel',
        color: s.color, c2: s.c2, hpScale: 2.6,
      });
      state.entities.push(ally);
      v.ally=ally; v.state=1; v.age=0; v.slamCd=0;
      state.shake(8);
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 100, color: s.c2, int: 3, life: 14, ml: 14 });
      spawnP(v.cx, v.cy, s.c2, 40, 'burst');
      return;
    }
    if (!v.ally||!v.ally.active||v.ally.hp<=0) { rmVfx(v); return; }
    const a = v.ally;
    const ax = a.x+a.w/2, ay = a.y+a.h/2;
    v.slamCd = Math.max(0, (v.slamCd||0)-1);

    const tgt = nearestEnemyEntity(ax, ay, 340);
    if (tgt) {
      const ex = tgt.x+tgt.w/2, ey = tgt.y+tgt.h/2;
      const ang = Math.atan2(ey-ay, ex-ax);
      const dist = Math.hypot(ex-ax, ey-ay);
      if (dist<48 && v.slamCd<=0) {
        v.slamCd=42;
        hurtEntity(tgt, s.dmg, ax, ay);
        spiritBlast(ax, ay+18, 60, Math.floor(s.dmg*0.7), 7, s.c2);
        state.shockwaves.push({ x: ax, y: ay+18, r: 0, maxR: 68, life: 14, maxLife: 14, color: s.c2 });
        state.shake(7);
        spawnP(ax, ay+18, s.c2, 32, 'burst');
        SoundFX.playNoise(0.4, 0.2, 150, 'lowpass');
        SoundFX.playTone(200, 'square', 0.16, 0.14);
      } else {
        a.x += Math.cos(ang)*3.8;
        a.y += Math.sin(ang)*3.0;
        a.vy += 0.35;
      }
    } else {
      a.vy+=0.4; a.x+=a.vx*0.85; a.y+=a.vy; a.vx*=0.85;
    }
    if (v.age%8===0) spawnP(ax, ay+26, s.color, 3, 'dust');
    if (v.age%16===0) state.dynamicLights.push({ x: ax, y: ay, r: 60, color: s.c2, int: 0.8, life: 8, ml: 8 });
    if (v.age>s.sentinelDur) {
      a.active=false;
      spawnP(ax, ay, s.c2, 28, 'burst');
      spiritBlast(ax, ay, 72, s.dmg, 5, s.c2);
      rmVfx(v);
    }
  },

  // ── PHOENIX DASH ───────────────────────────────────────────────────────────
  shenzhou_phoenix_dash(v) {
    const s = v.spell, p = state.player;
    if (v.state===0) {
      p.inv=true; p.vx*=0.2; p.vy*=0.2;
      if (v.age===1) {
        spawnP(v.fx, v.fy, s.c2, 34, 'sparkle');
        state.dynamicLights.push({ x: v.fx, y: v.fy, r: 90, color: s.color, int: 3, life: 12, ml: 12 });
      }
      // Partículas massivas girando (formação das asas)
      const orbitA = v.age*0.8;
      for (let i=0; i<5; i++) {
        const oa = orbitA+(i/5)*Math.PI*2;
        const or = 24+Math.sin(v.age*0.5)*8;
        state.particles.push({
          x: v.fx+Math.cos(oa)*or, y: v.fy+Math.sin(oa)*or*0.7,
          vx: Math.cos(oa)*2.5, vy: Math.sin(oa)*1.2-0.8,
          life: 24, ml: 24, color: i%2?s.color:s.c2,
          size: 3.5, grav: 0, type: 'ember',
        });
      }
      if (v.age>=s.dashWind) { v.state=1; v.age=0; }
    } else if (v.state===1) {
      const t = Math.min(1, v.age/s.dashTravel);
      const ease = t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
      const arcH = -45*Math.sin(t*Math.PI);
      p.x = v.fx+(v.tx-v.fx)*ease-p.w/2;
      p.y = v.fy+(v.ty-v.fy)*ease+arcH-p.h/2;
      p.vx=0; p.vy=0;
      const nx = p.x+p.w/2, ny = p.y+p.h/2;
      v.trail.push({ x: nx, y: ny, life: 18, maxLife: 18 });
      if (v.trail.length>20) v.trail.shift();
      for (const t of v.trail) t.life-=1;
      if (v.age%2===0) {
        spawnP(nx, ny, s.c2, 4, 'sparkle');
        spawnP(nx+Math.cos(v.angle+1.4)*34, ny+Math.sin(v.angle+1.4)*18, s.color, 2, 'ember');
        spawnP(nx+Math.cos(v.angle-1.4)*34, ny+Math.sin(v.angle-1.4)*18, s.color, 2, 'ember');
      }
      state.dynamicLights.push({ x: nx, y: ny, r: 100, color: s.color, int: 1.8, life: 2, ml: 2 });
      if (v.age>=s.dashTravel) {
        v.state=2; v.age=0;
        const sx = p.x+p.w/2, sy = p.y+p.h/2;
        for (const e of enemiesInRadius(sx, sy, 80)) {
          const a = Math.atan2(e.y+e.h/2-sy, e.x+e.w/2-sx);
          e.vx += Math.cos(a)*s.dashPush;
          e.vy += Math.sin(a)*s.dashPush-3;
        }
        for (let k=0; k<4; k++) state.shockwaves.push({
          x: sx, y: sy, r: 0, maxR: 60+k*35, life: 14+k*2, maxLife: 14+k*2, color: k%2?s.color:s.c2,
        });
        state.dynamicLights.push({ x: sx, y: sy, r: 170, color: s.core, int: 5, life: 16, ml: 16 });
        state.shake(12);
        flashScreen(s.c2, 0.5, 8);
        spawnP(sx, sy, s.core, 40, 'explode');
        spawnP(sx, sy, s.color, 26, 'ember');
        spawnP(sx, sy, s.c2, 18, 'sparkle');
        SoundFX.playSweep(700, 180, 'sine', 0.5, 0.26);
        SoundFX.playNoise(0.4, 0.24, 350, 'bandpass');
      }
    } else {
      p.inv=false;
      if (v.age>14) rmVfx(v);
    }
  },

  // ── EIGHT TRIGRAMS ─────────────────────────────────────────────────────────
  shenzhou_eight_trigrams(v) {
    const s = v.spell;
    if (v.state===0) {
      if (v.age===1) { spawnP(v.cx, v.cy, s.color, 28, 'burst'); state.shake(5); }
      if (v.age%12===0) {
        for (const e of enemiesInRadius(v.cx, v.cy, s.trigramR)) {
          hurtEntity(e, s.dmg, v.cx, v.cy);
          e.vx*=0.78; e.vy+=(Math.random()-0.5)*2;
        }
        SoundFX.playTone(440+Math.random()*120, 'triangle', 0.1, 0.18);
      }
      if (v.age%2===0) {
        const a = Math.random()*Math.PI*2, r = Math.random()*s.trigramR;
        state.particles.push({
          x: v.cx+Math.cos(a)*r, y: v.cy+Math.sin(a)*r*0.7,
          vx: 0, vy: -0.6-Math.random(), life: 32, ml: 32,
          color: Math.random()>0.5?s.c2:s.color, size: 3, grav: -0.02, type: 'sparkle',
        });
      }
      if (v.age%6===0) {
        for (let i=0; i<8; i++) {
          const a = (i/8)*Math.PI*2+v.age*0.014;
          state.particles.push({
            x: v.cx+Math.cos(a)*s.trigramR*0.75, y: v.cy+Math.sin(a)*s.trigramR*0.55,
            vx: Math.cos(a+Math.PI/2)*0.4, vy: Math.sin(a+Math.PI/2)*0.4-0.4,
            life: 44, ml: 44, color: s.c2, size: 2.5, grav: 0, type: 'sparkle',
          });
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: s.trigramR*1.1, color: s.color, int: 0.7, life: 2, ml: 2 });
      if (v.age>s.trigramDur) { spawnP(v.cx, v.cy, s.c2, 20, 'burst'); state.shake(5); rmVfx(v); }
    }
  },

  // ── MOONLIT MIRROR ─────────────────────────────────────────────────────────
  shenzhou_moonlit_mirror(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x+p.w/2; v.cy = p.y+p.h/2;
    if (v.state===0) {
      p.inv=true;
      if (v.age%3===0) {
        const moonA=v.age*0.07;
        for (let i=0; i<4; i++) {
          const a = moonA+(i/4)*Math.PI*2;
          const r = 34+Math.sin(moonA*0.4+i)*10;
          spawnP(v.cx+Math.cos(a)*r, v.cy+Math.sin(a)*r*0.8, s.c2, 1, 'trail');
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy, r: 100, color: s.color, int: 1+Math.sin(v.age*0.04)*0.4, life: 2, ml: 2 });
      if (v.age>s.wardDur) {
        v.state=1; v.age=0;
        p.inv=v.prevInv;
        spiritBlast(v.cx, v.cy, s.wardR, s.dmg, 9, s.color);
        for (let k=0; k<5; k++) state.shockwaves.push({
          x: v.cx, y: v.cy, r: 0, maxR: 70+k*30, life: 14+k*2, maxLife: 14+k*2, color: k%2?s.core:s.c2,
        });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 180, color: s.core, int: 4, life: 16, ml: 16 });
        state.shake(10);
        flashScreen(s.c2, 0.45, 6);
        spawnP(v.cx, v.cy, s.c2, 38, 'burst');
        spawnP(v.cx, v.cy, s.core, 22, 'sparkle');
        SoundFX.playSweep(700, 180, 'sine', 0.4, 0.35);
        SoundFX.playTone(1400, 'sine', 0.24, 0.3);
      }
    } else {
      if (v.age>16) rmVfx(v);
    }
  },

  // ── THUNDER TALISMAN ───────────────────────────────────────────────────────
  shenzhou_thunder_talisman(v) {
    const s = v.spell;
    if (v.state===0) {
      const t = Math.min(1, v.age/18);
      const ease = t*t*(3-2*t);
      v.talismanX = v.startX+(v.cx-v.startX)*ease;
      v.talismanY = v.startY+(v.cy-v.startY)*ease-30*Math.sin(t*Math.PI);
      if (v.age%2===0) spawnP(v.talismanX, v.talismanY, s.c2, 2, 'sparkle');
      if (v.age>22) { v.state=1; v.age=0; }
    } else if (v.state===1) {
      if (v.age===1) {
        for (const e of enemiesInRadius(v.cx, v.cy, s.talismanR)) {
          hurtEntity(e, s.dmg, v.cx, v.cy);
          e.vx*=0.4; e.vy-=5;
          spawnP(e.x+e.w/2, e.y+e.h/2, s.core, 12, 'burst');
        }
        state.shake(16);
        flashScreen(s.core, 0.7, 8);
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 220, color: s.core, int: 6, life: 12, ml: 12 });
        for (let k=0; k<3; k++) state.shockwaves.push({
          x: v.cx, y: v.cy, r: 0, maxR: 80+k*35, life: 16+k*2, maxLife: 16+k*2, color: k%2?s.core:s.c2,
        });
        // Raios ramificados
        for (let b=0; b<5; b++) {
          const bx = v.cx+(Math.random()-0.5)*100;
          const by = v.cy-120-Math.random()*80;
          const n = 5+Math.floor(Math.random()*4);
          const segs = [{ x: v.cx, y: v.cy-160 }];
          for (let si=1; si<n-1; si++) {
            const f = si/(n-1);
            segs.push({ x: v.cx+(bx-v.cx)*f+(Math.random()-0.5)*40, y: v.cy-160+(by-(v.cy-160))*f+(Math.random()-0.5)*35 });
          }
          segs.push({ x: bx, y: by });
          state.lightningBolts.push({ segments: segs, life: 12, color: s.core, width: 2.5+Math.random()*2 });
        }
        spawnP(v.cx, v.cy, s.core, 36, 'explode');
        spawnP(v.cx, v.cy, s.c2, 20, 'sparkle');
        SoundFX.playNoise(0.8, 0.35, 500, 'lowpass');
        SoundFX.playTone(120, 'sawtooth', 0.6, 0.24);
      }
      if (v.age>20) rmVfx(v);
    }
  },

  // ── WHITE SNAKE COIL ───────────────────────────────────────────────────────
  shenzhou_snake_coil(v) {
    const s = v.spell, e = v.target;
    if (!e||!e.active||e.hp<=0) { rmVfx(v); return; }
    v.cx = e.x+e.w/2; v.cy = e.y+e.h/2;
    state.frozenEntities.set(e, 6);
    if (v.age%18===0) {
      hurtEntity(e, Math.max(1, s.dmg), v.cx, v.cy);
      spawnP(v.cx, v.cy, s.color, 8, 'sparkle');
      SoundFX.playTone(240, 'sine', 0.1, 0.14);
    }
    if (v.age>s.snareDur) rmVfx(v);
  },

  // ── HEAVENLY DECREE — Dragão celestial colossal ────────────────────────────
  shenzhou_heavenly_decree(v) {
    const s = v.spell, p = state.player;
    v.cx = p.x+p.w/2; v.cy = p.y+p.h/2;
    p.vx*=0.35;
    if (v.state===0) {
      p.inv=true;
      if (v.age===1) { state.shake(24); SoundFX.playNoise(0.8, 0.9, 70, 'lowpass'); }
      state.shake(Math.min(v.age/6, 10));
      if (v.age%2===0) {
        for (let i=0; i<5; i++) {
          const a = Math.random()*Math.PI*2, d = 60+Math.random()*160;
          state.particles.push({
            x: v.cx+Math.cos(a)*d, y: v.cy-40+Math.sin(a)*d*0.5,
            vx: (Math.random()-0.5)*0.6, vy: -3-Math.random()*4,
            life: 38, ml: 38, color: Math.random()>0.5?s.color:SZ.gold,
            size: 3+Math.random()*4, grav: 0, type: 'sparkle',
          });
        }
      }
      state.dynamicLights.push({ x: v.cx, y: v.cy-70, r: 200+v.age*3, color: s.color, int: 2+v.age/30, life: 2, ml: 2 });
      if (v.age>60) { v.state=1; v.age=0; v.dragonAge=0; }
    } else if (v.state===1) {
      v.dragonAge=(v.dragonAge||0)+1;
      const dt = v.dragonAge;
      v.dragonBody=[];
      const cx = v.cx, cy = v.cy-200+dt*1.2;
      for (let i=0; i<80; i++) {
        const t = dt-i*0.6;
        if (t<0) continue;
        const angle = t*0.05+i*0.035;
        const radius = 70+Math.sin(t*0.025)*50+i*2.8;
        v.dragonBody.push({ x: cx+Math.cos(angle)*radius, y: cy+i*5.5, age: t });
      }
      // Dano por contato
      if (dt%5===0 && v.dragonBody.length>8) {
        for (const e of state.entities) {
          if (!isEnemyEntity(e)) continue;
          const ex=e.x+e.w/2, ey=e.y+e.h/2;
          for (const seg of v.dragonBody) {
            if (Math.hypot(ex-seg.x, ey-seg.y)<34) {
              hurtEntity(e, Math.floor(s.dmg*0.3), seg.x, seg.y);
              e.vx+=(Math.random()-0.5)*5; e.vy-=3;
              spawnP(ex, ey, s.c2, 5, 'sparkle');
              break;
            }
          }
        }
      }
      if (dt%2===0 && v.dragonBody.length>0) {
        for (let k=0; k<6; k++) {
          const ri = Math.floor(Math.random()*v.dragonBody.length);
          spawnP(v.dragonBody[ri].x, v.dragonBody[ri].y, k%2?s.c2:SZ.gold, 1, 'sparkle');
        }
      }
      state.dynamicLights.push({ x: v.cx, y: Math.max(0, v.cy-120+dt*0.9), r: 220, color: s.color, int: 2.5+Math.sin(dt*0.07)*0.8, life: 2, ml: 2 });
      state.shake(Math.min(5, 2.5+Math.sin(dt*0.04)*2.5));
      if (v.dragonAge>150) { v.state=2; v.age=0; }
    } else {
      if (v.age===1) {
        p.inv=v.prevInv;
        spiritBlast(v.cx, v.cy, 240, s.dmg*2, 16, s.color);
        for (let k=0; k<8; k++) state.shockwaves.push({
          x: v.cx, y: v.cy, r: 0, maxR: 110+k*50, life: 20+k*3, maxLife: 20+k*3, color: k%2?s.core:s.c2,
        });
        state.dynamicLights.push({ x: v.cx, y: v.cy, r: 500, color: s.core, int: 7, life: 18, ml: 18 });
        state.shake(40);
        flashScreen(s.core, 0.9, 14);
        spawnP(v.cx, v.cy, s.core, 60, 'explode');
        spawnP(v.cx, v.cy, s.c2, 40, 'burst');
        spawnP(v.cx, v.cy, SZ.gold, 34, 'sparkle');
        for (let i=0; i<60; i++) {
          const a = Math.random()*Math.PI*2, d = Math.random()*200;
          state.particles.push({
            x: v.cx+Math.cos(a)*d, y: v.cy+Math.sin(a)*d*0.6,
            vx: Math.cos(a)*5, vy: -5-Math.random()*10,
            life: 50+Math.random()*40, ml: 90,
            color: Math.random()>0.5?s.core:SZ.gold, size: 4+Math.random()*5, grav: -0.04, type: 'sparkle',
          });
        }
        SoundFX.playSweep(1200, 50, 'sawtooth', 1.0, 0.8);
        SoundFX.playTone(30, 'sine', 0.7, 1.2);
        SoundFX.playNoise(0.7, 0.6, 200, 'lowpass');
      }
      if (v.age>50) rmVfx(v);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VFX_DRAW
// ═══════════════════════════════════════════════════════════════════════════════
export const VFX_DRAW = {
  ...HOLD_VFX_DRAW,
  ...MANIFEST_VFX_DRAW,
  ...NEW_VFX_DRAW,

  // ── DRAGON BREATH ──────────────────────────────────────────────────────────
  shenzhou_dragon_breath(v, X) {
    const s = v.spell, T = performance.now()*0.001;
    if (v.state===0) {
      // Portal se abrindo
      X.save();
      X.translate(v.cx, v.cy);
      X.rotate(v.angle);
      X.globalCompositeOperation='lighter';
      const prog = Math.min(1, v.age/14);
      // Anel do portal
      X.strokeStyle=s.color;
      X.lineWidth=4*prog;
      X.globalAlpha=0.8*prog;
      X.beginPath(); X.arc(0, 0, 40*prog, 0, Math.PI*2); X.stroke();
      // Cabeça do dragão emergindo
      const emerge = prog*50;
      X.fillStyle=SZ.crimson;
      X.globalAlpha=0.9;
      X.beginPath();
      X.moveTo(emerge+30, 0);
      X.lineTo(emerge-8, -18);
      X.lineTo(emerge-22, -8);
      X.lineTo(emerge-34, 0);
      X.lineTo(emerge-22, 8);
      X.lineTo(emerge-8, 18);
      X.closePath();
      X.fill();
      // Olhos
      X.fillStyle='#ff4400';
      X.shadowColor='#ff0000';
      X.shadowBlur=12;
      X.fillRect(emerge-6, -10, 6, 6);
      X.fillRect(emerge-6, 4, 6, 6);
      X.shadowBlur=0;
      X.restore();
    } else if (v.state===1) {
      // Cone de fogo
      X.save();
      X.translate(v.cx, v.cy);
      X.rotate(v.angle);
      X.globalCompositeOperation='lighter';
      // Cone flamejante
      const grad = X.createLinearGradient(30, 0, 30+s.breathRange, 0);
      grad.addColorStop(0, SZ.core);
      grad.addColorStop(0.15, SZ.ember);
      grad.addColorStop(0.4, SZ.flame);
      grad.addColorStop(0.7, SZ.crimson+'aa');
      grad.addColorStop(1, 'transparent');
      X.fillStyle=grad;
      X.globalAlpha=0.6;
      const hw = s.breathRange*Math.tan(s.breathArc);
      X.beginPath();
      X.moveTo(30, 0);
      X.lineTo(30+s.breathRange, -hw);
      X.lineTo(30+s.breathRange*1.1, 0);
      X.lineTo(30+s.breathRange, hw);
      X.closePath();
      X.fill();
      // Segundo gradiente mais intenso no centro
      const coreGrad = X.createLinearGradient(30, 0, 30+s.breathRange*0.6, 0);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, SZ.ember);
      coreGrad.addColorStop(1, 'transparent');
      X.fillStyle=coreGrad;
      X.globalAlpha=0.4;
      X.beginPath();
      X.moveTo(30, 0);
      X.lineTo(30+s.breathRange*0.7, -hw*0.35);
      X.lineTo(30+s.breathRange*0.8, 0);
      X.lineTo(30+s.breathRange*0.7, hw*0.35);
      X.closePath();
      X.fill();
      // Scorch no chão
      X.fillStyle=SZ.crimson+'44';
      X.globalAlpha=0.3;
      X.fillRect(60, -hw*0.8, s.breathRange*0.7, hw*1.6);
      X.restore();
    }
  },

  // ── JADE SENTINEL ──────────────────────────────────────────────────────────
  shenzhou_jade_sentinel(v, X) {
    if (!v.ally||!v.ally.active) return;
    const a = v.ally;
    const cx = a.x+a.w/2, cy = a.y+a.h/2;
    const T = performance.now()*0.001;
    const pulse = Math.sin(T*2)*0.25+0.75;
    X.save();
    X.translate(cx, cy);
    // Aura de jade massiva
    X.globalCompositeOperation='lighter';
    X.globalAlpha=0.3*pulse;
    const auraGrad = X.createRadialGradient(0, 0, 6, 0, 0, 44);
    auraGrad.addColorStop(0, '#e0ffe0');
    auraGrad.addColorStop(1, 'transparent');
    X.fillStyle=auraGrad;
    X.beginPath(); X.arc(0, 0, 44, 0, Math.PI*2); X.fill();
    // Corpo — guerreiro de 3m
    X.globalCompositeOperation='source-over';
    X.globalAlpha=0.9;
    const plate = X.createLinearGradient(-14, -24, 14, 0);
    plate.addColorStop(0, '#5fdf8f'); plate.addColorStop(0.5, '#2eb872'); plate.addColorStop(1, '#1a7a4a');
    X.fillStyle=plate;
    X.fillRect(-12, -20, 24, 34);
    X.fillStyle='#7ff5aa';
    X.fillRect(-18, -22, 7, 12); X.fillRect(11, -22, 7, 12);
    X.fillStyle=plate;
    X.fillRect(-16, -10, 4, 20); X.fillRect(12, -10, 4, 20);
    X.fillRect(-8, 16, 8, 18); X.fillRect(0, 16, 8, 18);
    // Capacete
    X.fillStyle='#7ff5aa';
    X.beginPath(); X.arc(0, -16, 12, 0, Math.PI*2); X.fill();
    X.fillStyle='#e0ffe0'; X.fillRect(-8, -20, 16, 6);
    // Olhos
    X.fillStyle='#ffffff'; X.shadowColor='#e0ffe0'; X.shadowBlur=6;
    X.fillRect(-5, -18, 3, 3); X.fillRect(2, -18, 3, 3); X.shadowBlur=0;
    // Cetro
    X.strokeStyle='#7ff5aa'; X.lineWidth=3; X.globalAlpha=0.8;
    X.beginPath(); X.moveTo(14, -8); X.lineTo(14, 14); X.stroke();
    X.fillStyle='#e0ffe0'; X.beginPath(); X.arc(14, -10, 5, 0, Math.PI*2); X.fill();
    X.restore();
  },

  // ── PHOENIX DASH ───────────────────────────────────────────────────────────
  shenzhou_phoenix_dash(v, X) {
    if (v.state!==1) return;
    const s = v.spell;
    X.save();
    X.globalCompositeOperation='lighter';
    // Rastro flamejante massivo
    for (const t of v.trail) {
      if (t.life<=0) continue;
      const a = t.life/t.maxLife, r = 12*a;
      const grad = X.createRadialGradient(t.x, t.y, 0, t.x, t.y, r*3);
      grad.addColorStop(0, s.core); grad.addColorStop(0.3, s.color); grad.addColorStop(1, 'transparent');
      X.fillStyle=grad; X.globalAlpha=a*0.8;
      X.beginPath(); X.arc(t.x, t.y, r*3, 0, Math.PI*2); X.fill();
    }
    // Asas de fênix colossais
    if (v.trail.length>0) {
      const px = v.trail[v.trail.length-1].x, py = v.trail[v.trail.length-1].y;
      for (let side=-1; side<=1; side+=2) {
        const wa = v.angle+side*1.2;
        X.fillStyle=s.color; X.globalAlpha=0.55;
        X.beginPath();
        X.moveTo(px, py);
        X.lineTo(px+Math.cos(wa)*55, py+Math.sin(wa)*32);
        X.lineTo(px+Math.cos(wa+side*0.5)*85, py+Math.sin(wa+side*0.5)*42);
        X.closePath();
        X.fill();
        X.fillStyle=s.c2; X.globalAlpha=0.7;
        X.beginPath(); X.arc(px+Math.cos(wa)*55, py+Math.sin(wa)*32, 10, 0, Math.PI*2); X.fill();
      }
    }
    X.restore();
  },

  // ── EIGHT TRIGRAMS ─────────────────────────────────────────────────────────
  shenzhou_eight_trigrams(v, X) {
    const s = v.spell, T = performance.now()*0.001, a = Math.max(0, 1-v.age/s.trigramDur);
    X.save();
    X.translate(v.cx, v.cy);
    X.globalAlpha=a*0.8;
    X.globalCompositeOperation='lighter';
    // Aura
    const auraGrad = X.createRadialGradient(0, 0, 0, 0, 0, s.trigramR);
    auraGrad.addColorStop(0, s.color+'55'); auraGrad.addColorStop(0.6, s.color+'14'); auraGrad.addColorStop(1, 'transparent');
    X.fillStyle=auraGrad;
    X.beginPath(); X.arc(0, 0, s.trigramR, 0, Math.PI*2); X.fill();
    // Anéis
    X.strokeStyle=s.color; X.lineWidth=3.5; X.globalAlpha=a*0.95;
    X.beginPath(); X.arc(0, 0, s.trigramR, 0, Math.PI*2); X.stroke();
    X.strokeStyle=s.c2; X.lineWidth=2;
    X.beginPath(); X.arc(0, 0, s.trigramR*0.65, 0, Math.PI*2); X.stroke();
    // Yin-Yang
    const yyR = s.trigramR*0.32;
    X.fillStyle=s.color; X.globalAlpha=a*0.65;
    X.beginPath(); X.arc(0, 0, yyR, 0, Math.PI*2); X.fill();
    X.fillStyle='#1a1a0a'; X.beginPath(); X.arc(0, -yyR/2, yyR/2, 0, Math.PI*2); X.fill();
    X.fillStyle=s.color; X.beginPath(); X.arc(0, yyR/2, yyR/2, 0, Math.PI*2); X.fill();
    // 8 linhas radiais + trigramas
    for (let i=0; i<8; i++) {
      const angle = (i/8)*Math.PI*2+T*0.18;
      X.strokeStyle=i%2===0?s.color:s.c2; X.lineWidth=2; X.globalAlpha=a*0.7;
      X.beginPath();
      X.moveTo(Math.cos(angle)*yyR*1.15, Math.sin(angle)*yyR*1.15);
      X.lineTo(Math.cos(angle)*s.trigramR*0.95, Math.sin(angle)*s.trigramR*0.7);
      X.stroke();
      const tr = s.trigramR*0.62, ta = angle+0.05;
      const pat = [[1,1,1],[0,0,0],[1,0,1],[0,1,0],[1,1,0],[0,0,1],[1,0,0],[0,1,1]][i];
      for (let j=0; j<3; j++) {
        const lx = Math.cos(angle)*tr+Math.cos(ta)*(j-1)*20;
        const ly = Math.sin(angle)*tr*0.7+Math.sin(ta)*(j-1)*20;
        X.fillStyle=s.c2;
        if (pat[j]) X.fillRect(lx-6, ly-1, 12, 2);
        else { X.fillRect(lx-6, ly-1, 5, 2); X.fillRect(lx+1, ly-1, 5, 2); }
      }
    }
    X.restore();
  },

  // ── MOONLIT MIRROR ─────────────────────────────────────────────────────────
  shenzhou_moonlit_mirror(v, X) {
    if (v.state!==0) return;
    const s = v.spell, T = performance.now()*0.001;
    const phase = v.age/s.wardDur, crescent = Math.abs(Math.sin(phase*Math.PI));
    X.save();
    X.translate(v.cx, v.cy);
    X.globalCompositeOperation='lighter';
    const auraGrad = X.createRadialGradient(0, 0, 14, 0, 0, 70);
    auraGrad.addColorStop(0, s.c2+'44'); auraGrad.addColorStop(0.5, s.color+'1a'); auraGrad.addColorStop(1, 'transparent');
    X.fillStyle=auraGrad; X.globalAlpha=0.7;
    X.beginPath(); X.arc(0, 0, 70, 0, Math.PI*2); X.fill();
    X.globalCompositeOperation='source-over';
    X.fillStyle=s.c2; X.globalAlpha=0.55+crescent*0.4;
    X.beginPath(); X.arc(0, 0, 40, 0, Math.PI*2); X.fill();
    if (crescent<0.95) {
      X.fillStyle='#1a1a2e'; X.globalAlpha=(1-crescent)*0.7;
      const sx = 40*Math.cos(phase*Math.PI*2);
      X.beginPath(); X.arc(sx, 0, 40, 0, Math.PI*2); X.fill();
    }
    X.strokeStyle=s.core; X.lineWidth=3; X.globalAlpha=0.95;
    X.beginPath(); X.arc(0, 0, 44, 0, Math.PI*2); X.stroke();
    X.globalAlpha=0.5;
    for (let i=0; i<8; i++) {
      const a = T*0.7+(i/8)*Math.PI*2, r = 50+Math.sin(T*2+i)*6;
      X.fillStyle=s.core; X.beginPath(); X.arc(Math.cos(a)*r, Math.sin(a)*r, 3, 0, Math.PI*2); X.fill();
    }
    X.globalAlpha=0.35+Math.sin(T*1.5)*0.15;
    X.fillStyle=s.core; X.beginPath(); X.arc(6, -4, 16, 0, Math.PI*2); X.fill();
    X.restore();
  },

  // ── THUNDER TALISMAN ───────────────────────────────────────────────────────
  shenzhou_thunder_talisman(v, X) {
    const s = v.spell;
    if (v.state===0) {
      X.save(); X.translate(v.talismanX, v.talismanY);
      X.rotate(Math.sin(v.age*0.4)*0.25);
      X.fillStyle='#f5e6c8'; X.globalAlpha=0.85;
      X.fillRect(-14, -20, 28, 40);
      X.strokeStyle=s.color; X.lineWidth=2.5;
      X.strokeRect(-14, -20, 28, 40);
      X.fillStyle='#cc2200'; X.font='bold 18px serif'; X.textAlign='center';
      X.fillText('雷', 0, 5);
      X.fillStyle=s.color; X.fillRect(-6, 14, 12, 5);
      X.fillStyle='#f5e6c8'; X.fillRect(-4, 15, 8, 3);
      X.globalCompositeOperation='lighter'; X.globalAlpha=0.35;
      X.fillStyle=s.c2; X.fillRect(-14, -20, 28, 40);
      X.restore();
    }
    if (v.state===1 && v.age<10) {
      // Flash da tela
      X.save(); X.globalAlpha=0.3*(1-v.age/10); X.fillStyle=s.core;
      X.fillRect(0, 0, state.W, state.H); X.restore();
    }
  },

  // ── WHITE SNAKE COIL ───────────────────────────────────────────────────────
  shenzhou_snake_coil(v, X) {
    const e = v.target;
    if (!e) return;
    const cx = e.x+e.w/2, cy = e.y+e.h/2, T = performance.now()*0.001;
    X.save(); X.translate(cx, cy);
    X.globalCompositeOperation='lighter';
    const auraGrad = X.createRadialGradient(0, 0, 4, 0, 0, 36);
    auraGrad.addColorStop(0, '#f0e8ff55'); auraGrad.addColorStop(1, 'transparent');
    X.fillStyle=auraGrad; X.globalAlpha=0.5;
    X.beginPath(); X.arc(0, 0, 36, 0, Math.PI*2); X.fill();
    X.globalCompositeOperation='source-over';
    X.strokeStyle=v.spell.c2; X.lineWidth=5; X.lineCap='round'; X.globalAlpha=0.85;
    X.beginPath();
    for (let a=0; a<Math.PI*3.5; a+=0.1) {
      const r = 26+Math.sin(a*2.8+T*2.5)*8;
      const sx = Math.cos(a+T*1.8)*r, sy = Math.sin(a+T*1.8)*r*0.6-a*7;
      if (a===0) X.moveTo(sx, sy); else X.lineTo(sx, sy);
    }
    X.stroke();
    // Olhos da serpente
    const eyeA = T*1.8+Math.PI*2*0.35, eyeR = 26+Math.sin(eyeA*2.8+T*2.5)*8;
    const eyeX = Math.cos(eyeA+T*1.8)*eyeR, eyeY = Math.sin(eyeA+T*1.8)*eyeR*0.6-eyeA*7;
    X.fillStyle='#ff4466'; X.shadowColor='#ff4466'; X.shadowBlur=10; X.globalAlpha=0.9;
    X.beginPath(); X.arc(eyeX-3, eyeY-3, 4, 0, Math.PI*2); X.fill();
    X.beginPath(); X.arc(eyeX+6, eyeY-1, 4, 0, Math.PI*2); X.fill();
    X.shadowBlur=0;
    X.restore();
  },

  // ── HEAVENLY DECREE — Dragão dourado colossal ──────────────────────────────
  shenzhou_heavenly_decree(v, X) {
    const s = v.spell, T = performance.now()*0.001;
    if (v.state===0) {
      X.save();
      X.globalCompositeOperation='lighter';
      const prog = Math.min(1, v.age/50);
      const px = v.cx, py = v.cy-90;
      const auraGrad = X.createRadialGradient(px, py, 16, px, py, 200*prog);
      auraGrad.addColorStop(0, s.core+'88'); auraGrad.addColorStop(0.3, s.color+'44'); auraGrad.addColorStop(0.7, s.color+'0a'); auraGrad.addColorStop(1, 'transparent');
      X.fillStyle=auraGrad; X.globalAlpha=0.8;
      X.beginPath(); X.arc(px, py, 200*prog, 0, Math.PI*2); X.fill();
      X.strokeStyle=s.color; X.globalAlpha=0.7*prog;
      for (let r=0; r<4; r++) {
        const rr = (50+r*40)*prog;
        X.lineWidth=3-r*0.5;
        X.beginPath(); X.arc(px, py+Math.sin(T*1.2+r)*8, rr, T*(0.4+r*0.25), T*(0.4+r*0.25)+Math.PI*1.7); X.stroke();
      }
      X.restore();
    }
    if (v.state===1 && v.dragonBody && v.dragonBody.length>1) {
      X.save();
      X.globalCompositeOperation='lighter';
      const body = v.dragonBody;
      // Corpo massivo
      X.strokeStyle=SZ.gold; X.lineWidth=12; X.lineCap='round'; X.lineJoin='round';
      X.shadowColor=s.color; X.shadowBlur=20; X.globalAlpha=0.7;
      X.beginPath(); X.moveTo(body[0].x, body[0].y);
      for (let i=1; i<body.length; i++) X.lineTo(body[i].x, body[i].y);
      X.stroke();
      X.strokeStyle=s.core; X.lineWidth=5; X.shadowBlur=12; X.globalAlpha=0.95;
      X.beginPath(); X.moveTo(body[0].x, body[0].y);
      for (let i=1; i<body.length; i++) X.lineTo(body[i].x, body[i].y);
      X.stroke();
      X.shadowBlur=0;
      // Escamas
      X.fillStyle=s.c2; X.globalAlpha=0.55;
      for (let i=8; i<body.length-8; i+=5) {
        const seg = body[i], next = body[Math.min(i+1, body.length-1)];
        const ang = Math.atan2(next.y-seg.y, next.x-seg.x);
        X.beginPath(); X.arc(seg.x, seg.y, 6, ang, ang+Math.PI, false); X.fill();
      }
      // Cabeça
      if (body.length>4) {
        const head = body[body.length-1], neck = body[body.length-4];
        const ha = Math.atan2(head.y-neck.y, head.x-neck.x);
        X.save(); X.translate(head.x, head.y); X.rotate(ha);
        X.fillStyle=SZ.gold; X.globalAlpha=0.9;
        X.beginPath();
        X.moveTo(22, 0); X.lineTo(-4, -12); X.lineTo(-16, -6);
        X.lineTo(-24, 0); X.lineTo(-16, 6); X.lineTo(-4, 12);
        X.closePath(); X.fill();
        X.fillStyle=s.c2;
        X.beginPath(); X.moveTo(-8, 5); X.lineTo(26, 0); X.lineTo(-8, -5); X.closePath(); X.fill();
        X.fillStyle='#ff4444'; X.shadowColor='#ff0000'; X.shadowBlur=10;
        X.fillRect(-4, -8, 5, 5); X.fillRect(-4, 3, 5, 5); X.shadowBlur=0;
        X.strokeStyle=s.c2; X.lineWidth=3; X.globalAlpha=0.8;
        X.beginPath(); X.moveTo(-14, -6); X.quadraticCurveTo(0, -24, 10, -22); X.stroke();
        X.beginPath(); X.moveTo(-14, 6); X.quadraticCurveTo(0, 24, 10, 22); X.stroke();
        X.strokeStyle=s.core; X.lineWidth=1.5; X.globalAlpha=0.5;
        X.beginPath(); X.moveTo(4, -10); X.quadraticCurveTo(22, -22, 32, -12); X.stroke();
        X.beginPath(); X.moveTo(4, 10); X.quadraticCurveTo(22, 22, 32, 12); X.stroke();
        X.restore();
      }
      X.restore();
    }
  },
};
