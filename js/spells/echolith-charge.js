// echolith-charge.js — Echolith school spell (Charge)
import { state } from '../core/state.js?v=7';
import { SoundFX } from '../core/sounds.js?v=7';
import { spawnP, explode } from '../core/utils.js?v=7';
import { drawEcholithHalo, drawEcholithSigil, drawEcholithWingPair } from './echolith-art.js?v=1';

export const SPELL = {
  name: 'Seraph Verdict',
  icon: '☼',
  key: '5',
  category: 'Charge',
  color: '#f4d36a',
  c2: '#fff4b8',
  core: '#ffffff',
  speed: 0,
  dmg: 28,
  mana: 28,
  cd: 1300,
  r: 0,
  grav: 0,
  drag: 1,
  bounce: 0,
  trail: 'echolith_charge_trail',
  isEcholithCharge: true,
  echolithSide: 'good',
  maxCharge: 110,
  chargeDrain: 0.2,
  desc: 'Hold a halo charge, then loose a seraph lance that writes judgment through the wicked',
};

function removeVfx(v) {
  const idx = state.vfxSequences.indexOf(v);
  if (idx !== -1) state.vfxSequences.splice(idx, 1);
}

function casterOrigin() {
  return {
    x: state.player.x + state.player.w / 2 + state.player.facing * 10,
    y: state.player.y + 8,
  };
}

function aimDir(ox, oy) {
  const tx = state.mouse?.x ?? (ox + state.player.facing * 20);
  const ty = state.mouse?.y ?? oy;
  const a = Math.atan2(ty - oy, tx - ox);
  return { x: Math.cos(a), y: Math.sin(a), a };
}

function sideVector(vx, vy) {
  const len = Math.hypot(vx, vy) || 1;
  return { x: -vy / len, y: vx / len };
}

export const FIRE_HANDLERS = {
  isEcholithCharge(s, ox, oy, tx, ty) {
    const active = state.vfxSequences.find((v) => v.type === 'echolith_charge' && v.state === 0);
    if (active) {
      active.state = 1;
      active.age = 0;
      return true;
    }

    state.vfxSequences.push({
      type: 'echolith_charge',
      state: 0,
      age: 0,
      spell: s,
      charge: 0,
      ox,
      oy,
      tx,
      ty,
      phase: Math.random() * Math.PI * 2,
      beatLevel: 0,
    });

    SoundFX.playSweep(80, 620, 'sine', 0.2, 0.2);
    return true;
  },
};

export const PROJ_HOOKS = {
  isEcholithChargeShot: {
    onUpdate(p, s) {
      p.vx *= 1.007;
      p.vy *= 1.007;
      const sv = sideVector(p.vx, p.vy);
      const twist = Math.sin((p.age || 0) * 0.5) * 0.32;
      p.x += sv.x * twist;
      p.y += sv.y * twist;

      if ((p.age || 0) % 2 === 0) {
        spawnP(p.x, p.y, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
      }
      if ((p.age || 0) % 5 === 0) {
        state.dynamicLights.push({ x: p.x, y: p.y, r: 34, color: s.core, int: 1.3, life: 2, ml: 2 });
      }
    },
    onLand(p, s) {
      explode(p.x, p.y, s.exR || 95, s.exF || 14, s.dmg, s.color, s.c2);
      state.shockwaves.push({ x: p.x, y: p.y, r: 0, maxR: (s.exR || 95) * 1.3, life: 13, maxLife: 13, color: s.core });
      state.vfxSequences.push({
        type: 'echolith_charge_impact',
        state: 0,
        age: 0,
        spell: s,
        cx: p.x,
        cy: p.y,
        phase: Math.random() * Math.PI * 2,
        pulseDone: false,
      });
      SoundFX.playSweep(1700, 180, 'sawtooth', 0.26, 0.14);
      return true;
    },
  },
};

export const TRAIL_EMITTERS = {
  echolith_charge_trail(p, s) {
    if ((p.age || 0) % 2 !== 0) return;
    state.particles.push({
      x: p.x,
      y: p.y,
      vx: -p.vx * 0.14 + (Math.random() - 0.5) * 0.6,
      vy: -p.vy * 0.14 + (Math.random() - 0.5) * 0.6,
      life: 20,
      ml: 20,
      color: Math.random() > 0.5 ? s.color : s.c2,
      size: 2 + Math.random() * 2,
      grav: 0,
      type: 'trail',
    });
  },
};

export const VFX_UPDATE = {
  echolith_charge(v) {
    const s = v.spell;
    const o = casterOrigin();
    v.ox = o.x;
    v.oy = o.y;
    v.phase += 0.12;

    if (v.state === 0) {
      state.player.castAnim = 280;
      state.player.castType = 'channel';
      state.player.staffGlow = 260;

      if (state.mouse?.down && v.charge < s.maxCharge) {
        v.charge += 1;
        if (v.age % 3 === 0) {
          state.player.mana = Math.max(0, state.player.mana - (s.chargeDrain || 0.2));
          if (state.player.mana <= 0.1) {
            v.state = 1;
            v.age = 0;
          }
        }
      } else {
        v.state = 1;
        v.age = 0;
      }

      const q = Math.max(0, Math.min(1, v.charge / s.maxCharge));
      const beat = Math.floor(q * 4);
      if (beat > v.beatLevel) {
        v.beatLevel = beat;
        SoundFX.playTone(220 + beat * 120, 'triangle', 0.07, 0.08);
        state.shake(0.9 + beat * 0.2);
      }

      if (v.age % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 16 + q * 26;
        spawnP(v.ox + Math.cos(a) * r, v.oy + Math.sin(a) * r, Math.random() > 0.5 ? s.c2 : s.core, 1, 'sparkle');
      }

      if (v.age % 4 === 0) {
        state.shockwaves.push({ x: v.ox, y: v.oy, r: 0, maxR: 18 + q * 20, life: 5, maxLife: 5, color: s.c2 });
      }

      state.dynamicLights.push({
        x: v.ox,
        y: v.oy,
        r: 34 + q * 56,
        color: s.core,
        int: 0.9 + q,
        life: 2,
        ml: 2,
      });

      return;
    }

    if (!v.fired) {
      v.fired = true;
      const power = Math.max(0.2, v.charge / s.maxCharge);
      const dir = aimDir(v.ox, v.oy);
      const shotSpeed = 12 + power * 14;

      state.projectiles.push({
        x: v.ox,
        y: v.oy,
        vx: dir.x * shotSpeed,
        vy: dir.y * shotSpeed,
        spell: {
          name: 'Seraph Verdict Shot',
          icon: '▸',
          color: s.color,
          c2: s.c2,
          core: s.core,
          speed: shotSpeed,
          dmg: Math.floor(s.dmg + power * 52),
          mana: 0,
          cd: 0,
          r: 4 + power * 4,
          grav: 0,
          drag: 1,
          bounce: 0,
          trail: 'echolith_charge_trail',
          exR: Math.floor(62 + power * 72),
          exF: Math.floor(10 + power * 8),
          isEcholithChargeShot: true,
        },
        life: 170,
        age: 0,
        trail: [],
        hitList: [],
        bounces: 0,
      });

      state.vfxSequences.push({
        type: 'echolith_charge_recoil',
        state: 0,
        age: 0,
        spell: s,
        ox: v.ox,
        oy: v.oy,
        dirX: dir.x,
        dirY: dir.y,
        power,
        phase: Math.random() * Math.PI * 2,
      });

      state.shake(4 + power * 7);
      SoundFX.playSweep(260, 1900, 'square', 0.2 + power * 0.06, 0.16);
      spawnP(v.ox, v.oy, s.core, 12 + Math.floor(power * 10), 'burst');
    }

    if (v.age > 8) removeVfx(v);
  },

  echolith_charge_recoil(v) {
    v.phase += 0.25;

    if (v.age % 2 === 0) {
      const t = Math.random();
      const len = 28 + v.power * 90;
      const x = v.ox + v.dirX * len * t;
      const y = v.oy + v.dirY * len * t;
      spawnP(x, y, Math.random() > 0.5 ? v.spell.c2 : v.spell.core, 1, 'sparkle');
    }

    state.dynamicLights.push({
      x: v.ox + v.dirX * (18 + v.power * 34),
      y: v.oy + v.dirY * (18 + v.power * 34),
      r: 42 + v.power * 42,
      color: v.spell.core,
      int: 1.3,
      life: 2,
      ml: 2,
    });

    if (v.age > 14) removeVfx(v);
  },

  echolith_charge_impact(v) {
    const s = v.spell;
    v.phase += 0.18;

    if (!v.pulseDone && v.age > 6) {
      v.pulseDone = true;
      state.shockwaves.push({ x: v.cx, y: v.cy, r: 0, maxR: (s.exR || 95) * 1.7, life: 10, maxLife: 10, color: s.c2 });
      SoundFX.playTone(1160, 'triangle', 0.07, 0.07);
    }

    state.dynamicLights.push({
      x: v.cx,
      y: v.cy,
      r: (s.exR || 95) * 1.1,
      color: s.core,
      int: 0.9,
      life: 2,
      ml: 2,
    });

    if (v.age > 20) removeVfx(v);
  },
};

export const VFX_DRAW = {
  echolith_charge(v, X) {
    const s = v.spell;
    const q = Math.max(0, Math.min(1, (v.charge || 0) / (s.maxCharge || 100)));

    X.save();
    X.translate(v.ox, v.oy);

    X.globalAlpha = 0.16 + q * 0.2;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, 14 + q * 18, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.72;
    X.strokeStyle = s.c2;
    X.lineWidth = 1.8 + q * 1.6;
    X.beginPath();
    X.arc(0, 0, 18 + q * 24, 0, Math.PI * 2);
    X.stroke();

    X.globalAlpha = 0.46;
    X.strokeStyle = s.core;
    X.lineWidth = 1.2;
    X.setLineDash([6, 5]);
    X.lineDashOffset = -(v.phase || 0) * 10;
    X.beginPath();
    X.arc(0, 0, 12 + q * 34, 0, Math.PI * 2);
    X.stroke();
    X.setLineDash([]);

    drawEcholithSigil(X, 'good', 0, 0, 22 + q * 28, v.phase, {
      good: s.color,
      evil: '#8f0713',
      core: s.core,
    });

    for (let i = 0; i < 4; i++) {
      const a = (v.phase || 0) * (1 + i * 0.25) + i * (Math.PI * 0.5);
      const r = 10 + q * 30 + i * 5;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      X.globalAlpha = 0.65;
      X.fillStyle = i % 2 === 0 ? s.core : s.c2;
      X.beginPath();
      X.arc(x, y, 2 + q * 2, 0, Math.PI * 2);
      X.fill();
    }

    X.restore();
  },

  echolith_charge_recoil(v, X) {
    const s = v.spell;
    const a = 1 - v.age / 14;
    const len = 34 + v.power * 96;
    const px = -v.dirY;
    const py = v.dirX;

    X.save();
    X.globalAlpha = 0.28 * a;
    X.fillStyle = s.color;
    X.beginPath();
    X.moveTo(v.ox + px * 8, v.oy + py * 8);
    X.lineTo(v.ox - px * 8, v.oy - py * 8);
    X.lineTo(v.ox + v.dirX * len, v.oy + v.dirY * len);
    X.closePath();
    X.fill();

    X.globalAlpha = 0.8 * a;
    X.strokeStyle = s.core;
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(v.ox, v.oy);
    X.lineTo(v.ox + v.dirX * len, v.oy + v.dirY * len);
    X.stroke();

    drawEcholithWingPair(
      X,
      v.ox + v.dirX * (20 + v.power * 28),
      v.oy + v.dirY * (20 + v.power * 28),
      20 + v.power * 24,
      v.phase,
      s.core,
      0.38 * a,
    );

    X.restore();
  },

  echolith_charge_impact(v, X) {
    const s = v.spell;
    const a = 1 - v.age / 20;
    const r = (s.exR || 95) * (0.28 + (1 - a) * 0.78);

    X.save();
    X.translate(v.cx, v.cy);

    X.globalAlpha = 0.2 * a;
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    X.fill();

    X.globalAlpha = 0.75 * a;
    X.strokeStyle = s.c2;
    X.lineWidth = 2;
    X.beginPath();
    X.ellipse(0, 0, r, r * 0.68, v.phase * 0.16, 0, Math.PI * 2);
    X.stroke();

    drawEcholithHalo(X, 0, 0, r * 0.68, r * 0.22, v.phase, s.color, 0.48 * a);

    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + v.phase * 0.3;
      X.globalAlpha = 0.62 * a;
      X.strokeStyle = i % 2 ? s.core : s.c2;
      X.lineWidth = 1.3;
      X.beginPath();
      X.moveTo(Math.cos(ang) * 8, Math.sin(ang) * 8);
      X.lineTo(Math.cos(ang) * (18 + r * 0.6), Math.sin(ang) * (18 + r * 0.6));
      X.stroke();
    }

    X.restore();
  },
};
