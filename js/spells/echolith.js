// ═══════════════════════════════════════════════════════════════════════════
// echolith.js — Echolith School (aggregator)
//
// Theme:
//   Moral ritual magic. The school stages the difference between Good and Evil:
//   halos, horns, absolution, damnation and the unstable threshold between them.
//
// Design goal:
//   Keep the base game pixel-art, while making each spell read as a premium
//   cinematic moment using layered particles, dynamic light, moral push/pull,
//   staged timing and high-impact aftermath.
// ═══════════════════════════════════════════════════════════════════════════

import {
  SPELL as RAY_SPELL,
  FIRE_HANDLERS as RAY_FIRE_HANDLERS,
  PROJ_HOOKS as RAY_PROJ_HOOKS,
  TRAIL_EMITTERS as RAY_TRAIL_EMITTERS,
  VFX_UPDATE as RAY_VFX_UPDATE,
  VFX_DRAW as RAY_VFX_DRAW,
} from './echolith-ray.js?v=4';
import {
  SPELL as HOLD_SPELL,
  FIRE_HANDLERS as HOLD_FIRE_HANDLERS,
  PROJ_HOOKS as HOLD_PROJ_HOOKS,
  TRAIL_EMITTERS as HOLD_TRAIL_EMITTERS,
  VFX_UPDATE as HOLD_VFX_UPDATE,
  VFX_DRAW as HOLD_VFX_DRAW,
} from './echolith-hold.js?v=3';
import {
  SPELL as SUMMON_SPELL,
  FIRE_HANDLERS as SUMMON_FIRE_HANDLERS,
  PROJ_HOOKS as SUMMON_PROJ_HOOKS,
  TRAIL_EMITTERS as SUMMON_TRAIL_EMITTERS,
  VFX_UPDATE as SUMMON_VFX_UPDATE,
  VFX_DRAW as SUMMON_VFX_DRAW,
} from './echolith-summon.js?v=3';
import {
  SPELL as CAST_SPELL,
  FIRE_HANDLERS as CAST_FIRE_HANDLERS,
  PROJ_HOOKS as CAST_PROJ_HOOKS,
  TRAIL_EMITTERS as CAST_TRAIL_EMITTERS,
  VFX_UPDATE as CAST_VFX_UPDATE,
  VFX_DRAW as CAST_VFX_DRAW,
} from './echolith-cast.js?v=3';
import {
  SPELL as CHARGE_SPELL,
  FIRE_HANDLERS as CHARGE_FIRE_HANDLERS,
  PROJ_HOOKS as CHARGE_PROJ_HOOKS,
  TRAIL_EMITTERS as CHARGE_TRAIL_EMITTERS,
  VFX_UPDATE as CHARGE_VFX_UPDATE,
  VFX_DRAW as CHARGE_VFX_DRAW,
} from './echolith-charge.js?v=4';
import {
  SPELL as DASH_SPELL,
  FIRE_HANDLERS as DASH_FIRE_HANDLERS,
  PROJ_HOOKS as DASH_PROJ_HOOKS,
  TRAIL_EMITTERS as DASH_TRAIL_EMITTERS,
  VFX_UPDATE as DASH_VFX_UPDATE,
  VFX_DRAW as DASH_VFX_DRAW,
} from './echolith-dash.js?v=3';
import {
  SPELL as MANIFEST_SPELL,
  FIRE_HANDLERS as MANIFEST_FIRE_HANDLERS,
  PROJ_HOOKS as MANIFEST_PROJ_HOOKS,
  TRAIL_EMITTERS as MANIFEST_TRAIL_EMITTERS,
  VFX_UPDATE as MANIFEST_VFX_UPDATE,
  VFX_DRAW as MANIFEST_VFX_DRAW,
} from './echolith-manifest.js?v=3';
import {
  SPELL as ULT1_SPELL,
  FIRE_HANDLERS as ULT1_FIRE_HANDLERS,
  PROJ_HOOKS as ULT1_PROJ_HOOKS,
  TRAIL_EMITTERS as ULT1_TRAIL_EMITTERS,
  VFX_UPDATE as ULT1_VFX_UPDATE,
  VFX_DRAW as ULT1_VFX_DRAW,
} from './echolith-ultimate-1.js?v=3';
import {
  SPELL as ULT2_SPELL,
  FIRE_HANDLERS as ULT2_FIRE_HANDLERS,
  PROJ_HOOKS as ULT2_PROJ_HOOKS,
  TRAIL_EMITTERS as ULT2_TRAIL_EMITTERS,
  VFX_UPDATE as ULT2_VFX_UPDATE,
  VFX_DRAW as ULT2_VFX_DRAW,
} from './echolith-ultimate-2.js?v=3';
import {
  SPELL_DEFS as NEW_SPELL_DEFS,
  FIRE_HANDLERS as NEW_FIRE_HANDLERS,
  PROJ_HOOKS as NEW_PROJ_HOOKS,
  TRAIL_EMITTERS as NEW_TRAIL_EMITTERS,
  VFX_UPDATE as NEW_VFX_UPDATE,
  VFX_DRAW as NEW_VFX_DRAW,
} from './echolith-new.js?v=1';

const LEGACY_SPELL_DEFS = [
  RAY_SPELL,
  HOLD_SPELL,
  SUMMON_SPELL,
  CAST_SPELL,
  CHARGE_SPELL,
  DASH_SPELL,
  MANIFEST_SPELL,
  ULT1_SPELL,
  ULT2_SPELL,
];

const REMOVED_SPELLS = new Set([
  'Absolution Thorn',
  'Stigmata Bloom',
  'Altar of Scales',
  'Black Mass: Abyss Bell',
]);

export const SPELL_DEFS = [
  ...LEGACY_SPELL_DEFS.filter((spell) => !REMOVED_SPELLS.has(spell.name)),
  ...NEW_SPELL_DEFS,
];

export const FIRE_HANDLERS = {
  ...RAY_FIRE_HANDLERS,
  ...HOLD_FIRE_HANDLERS,
  ...SUMMON_FIRE_HANDLERS,
  ...CAST_FIRE_HANDLERS,
  ...CHARGE_FIRE_HANDLERS,
  ...DASH_FIRE_HANDLERS,
  ...MANIFEST_FIRE_HANDLERS,
  ...ULT1_FIRE_HANDLERS,
  ...ULT2_FIRE_HANDLERS,
  ...NEW_FIRE_HANDLERS,
};

export const PROJ_HOOKS = {
  ...RAY_PROJ_HOOKS,
  ...HOLD_PROJ_HOOKS,
  ...SUMMON_PROJ_HOOKS,
  ...CAST_PROJ_HOOKS,
  ...CHARGE_PROJ_HOOKS,
  ...DASH_PROJ_HOOKS,
  ...MANIFEST_PROJ_HOOKS,
  ...ULT1_PROJ_HOOKS,
  ...ULT2_PROJ_HOOKS,
  ...NEW_PROJ_HOOKS,
};

export const TRAIL_EMITTERS = {
  ...RAY_TRAIL_EMITTERS,
  ...HOLD_TRAIL_EMITTERS,
  ...SUMMON_TRAIL_EMITTERS,
  ...CAST_TRAIL_EMITTERS,
  ...CHARGE_TRAIL_EMITTERS,
  ...DASH_TRAIL_EMITTERS,
  ...MANIFEST_TRAIL_EMITTERS,
  ...ULT1_TRAIL_EMITTERS,
  ...ULT2_TRAIL_EMITTERS,
  ...NEW_TRAIL_EMITTERS,
};

export const VFX_UPDATE = {
  ...RAY_VFX_UPDATE,
  ...HOLD_VFX_UPDATE,
  ...SUMMON_VFX_UPDATE,
  ...CAST_VFX_UPDATE,
  ...CHARGE_VFX_UPDATE,
  ...DASH_VFX_UPDATE,
  ...MANIFEST_VFX_UPDATE,
  ...ULT1_VFX_UPDATE,
  ...ULT2_VFX_UPDATE,
  ...NEW_VFX_UPDATE,
};

export const VFX_DRAW = {
  ...RAY_VFX_DRAW,
  ...HOLD_VFX_DRAW,
  ...SUMMON_VFX_DRAW,
  ...CAST_VFX_DRAW,
  ...CHARGE_VFX_DRAW,
  ...DASH_VFX_DRAW,
  ...MANIFEST_VFX_DRAW,
  ...ULT1_VFX_DRAW,
  ...ULT2_VFX_DRAW,
  ...NEW_VFX_DRAW,
};
