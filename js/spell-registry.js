// ═══════════════════════════════════════════════════════════════════════════
// spell-registry.js — Central registry for all spell schools
//
// HOW TO ADD A NEW SCHOOL:
//   1. Create  js/spells/your-school.js  following the nature.js pattern
//   2. Import it below and add it to SCHOOLS
//   3. That's it — no changes needed to engine or main loop
// ═══════════════════════════════════════════════════════════════════════════

import * as Nature from './spells/nature.js?v=7';
import * as Wind from './spells/wind.js?v=7';
import * as Fire from './spells/fire.js?v=7';
import * as Water from './spells/water.js?v=7';
import * as Lightning from './spells/lightning.js?v=7';
import * as Arcane from './spells/arcane.js?v=7';
import * as Void from './spells/void.js?v=7';
import * as Holy from './spells/holy.js?v=7';
import * as Chrono from './spells/chrono.js?v=7';
import * as Celestial from './spells/celestial.js?v=7';
import * as PureCinema from './spells/purecinema.js?v=7';

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
  PureCinema
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
