// ═══════════════════════════════════════════════════════════════════════════
// spell-registry.js — Central registry for all spell schools
//
// HOW TO ADD A NEW SCHOOL:
//   1. Create  js/spells/your-school.js  following the nature.js pattern
//   2. Import it below and add it to SCHOOLS
//   3. That's it — no changes needed to engine or main loop
// ═══════════════════════════════════════════════════════════════════════════

import * as Nature from './spells/nature.js?v=8';
import * as Wind from './spells/wind.js?v=8';
import * as Fire from './spells/fire.js?v=9';
import * as Water from './spells/water.js?v=9';
import * as Lightning from './spells/lightning.js?v=9';
import * as Arcane from './spells/arcane.js?v=9';
import * as Void from './spells/void.js?v=8';
import * as Holy from './spells/holy.js?v=8';
import * as Chrono from './spells/chrono.js?v=8';
import * as Celestial from './spells/celestial.js?v=9';
import * as PureCinema from './spells/purecinema.js?v=9';
import * as Aetherforge from './spells/aetherforge.js?v=9';
import * as Echolith from './spells/echolith.js?v=4';
import * as Tensorveil from './spells/tensorveil.js?v=3';
import * as Lust from './spells/lust.js?v=2';
import * as Elemental from './spells/elemental.js?v=4';
import * as Dream from './spells/dream.js?v=3';
import * as Constante from './spells/constante.js?v=1';
import * as Aracnidea from './spells/aracnidea.js?v=1';
import * as Mycobiota from './spells/mycobiota.js?v=1';
import * as Prismatica from './spells/prismatica.js?v=1';

// ── Registered schools ─────────────────────────────────────────────────────
// Each school module must export:
//   SPELL_DEFS    — array of spell definition objects
//   FIRE_HANDLERS — { flagName(s, ox, oy, tx, ty) → bool }
//   PROJ_HOOKS    — { flagName | trailName: { onUpdate?, onLand?, onPreCast? } }
//   TRAIL_EMITTERS— { trailName(p, s) }
//   VFX_UPDATE    — { 'vfx-type'(v) }
//   VFX_DRAW      — { 'vfx-type'(v, X) }

const SCHOOLS = [
  Nature,
  Wind,
  Fire,
  Water,
  Lightning,
  Arcane,
  Void,
  Holy,
  Chrono,
  Celestial,
  PureCinema,
  Aetherforge,
  Echolith,
  Tensorveil,
  Lust,
  Elemental,
  Dream,
  Constante,
  Aracnidea,
  Mycobiota,
  Prismatica,
];

const SCHOOL_META = [
  { name: 'Nature', icon: '🌿', color: '#44cc22' },
  { name: 'Wind', icon: '🌪️', color: '#aaddff' },
  { name: 'Fire', icon: '🔥', color: '#ff4400' },
  { name: 'Water', icon: '💧', color: '#4488ff' },
  { name: 'Lightning', icon: '⚡', color: '#ffcc00' },
  { name: 'Arcane', icon: '🔮', color: '#aa55ff' },
  { name: 'Void', icon: '🌑', color: '#7722cc' },
  { name: 'Holy', icon: '✨', color: '#ffdd44' },
  { name: 'Chrono', icon: '⏳', color: '#ffaa00' },
  { name: 'Celestial', icon: '🌟', color: '#88ccff' },
  { name: 'PureCinema', icon: '🎬', color: '#c4a060' },
  { name: 'Aetherforge', icon: '🜂', color: '#39f0ff' },
  { name: 'Echolith', icon: '⚖️', color: '#f4d36a' },
  { name: 'Tensorveil', icon: '🧮', color: '#9dff5a' },
  { name: 'Lust', icon: '💘', color: '#ff5caa' },
  { name: 'Elemental', icon: '🏹', color: '#5db75c' },
  { name: 'Dream', icon: '🌙', color: '#9d8bf0' },
  { name: 'Constante', icon: '🜏', color: '#d6b56d' },
  { name: 'Aracnidea', icon: '🕷️', color: '#8f3dff' },
  { name: 'Mycobiota', icon: '🍄', color: '#8fcf5a' },
  { name: 'Prismatica', icon: '🔆', color: '#5ec8ff' },
];

/** School info with spell count, for UI grouping */
export const SCHOOL_INFO = SCHOOLS.map((school, i) => ({
  ...SCHOOL_META[i],
  count: school.SPELL_DEFS.length,
}));

/** All spell definitions in order, each tagged with its school module */
export const SPELL_DEFS = SCHOOLS.flatMap(school => school.SPELL_DEFS);

/** Fire handler map: spellFlag → handler fn */
export const FIRE_HANDLERS = Object.assign({}, ...SCHOOLS.map(s => s.FIRE_HANDLERS || {}));

/** Projectile hook map: flag/trail → { onUpdate, onLand, onPreCast } */
export const PROJ_HOOKS = Object.assign({}, ...SCHOOLS.map(s => s.PROJ_HOOKS || {}));

/** Trail emitter map: trail name → emitter fn */
export const TRAIL_EMITTERS = Object.assign({}, ...SCHOOLS.map(s => s.TRAIL_EMITTERS || {}));

/** Custom projectile-body draw map: trail name → draw(p, s, X) */
export const PROJ_DRAW = Object.assign({}, ...SCHOOLS.map(s => s.PROJ_DRAW || {}));

/** VFX update handler map: vfx type → update fn */
export const VFX_UPDATE = Object.assign({}, ...SCHOOLS.map(s => s.VFX_UPDATE || {}));

/** VFX draw handler map: vfx type → draw fn */
export const VFX_DRAW = Object.assign({}, ...SCHOOLS.map(s => s.VFX_DRAW || {}));

// ── Helper: attach projectile hooks directly onto spell objects ─────────────
// Called once at startup. Makes runtime lookups O(1) per projectile.
export function attachHooksToSpells(spells) {
  for (const spell of spells) {
    // Check each registered hook key against the spell's flags
    for (const [key, hook] of Object.entries(PROJ_HOOKS)) {
      if (spell[key] || spell.trail === key) {
        spell._hook = hook;
        break;
      }
    }
  }
}
