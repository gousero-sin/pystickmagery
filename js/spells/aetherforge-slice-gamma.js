import { createHoldSpell, HOLD_FIRE_HANDLERS, HOLD_VFX_UPDATE, HOLD_VFX_DRAW } from './hold.js?v=7';
import { createManifestSpell, MANIFEST_FIRE_HANDLERS, MANIFEST_VFX_UPDATE, MANIFEST_VFX_DRAW } from './manifest.js?v=8';

export const GAMMA_SPELL_DEFS = [
  createHoldSpell({
    name: 'Graviton Crucible',
    icon: '⚙️',
    key: 'A',
    color: '#ff7a3c',
    c2: '#6ef1ff',
    core: '#fff0cf',
    mana: 24,
    cd: 1080,
    dmg: 4,
    holdStyle: 'aetherforge',
    holdProfile: 'aetherforge_crucible',
    holdR: 98,
    holdForce: 0.36,
    holdLift: 0.24,
    holdDrain: 0.29,
    holdDealsDamage: true,
    releaseR: 104,
    releaseDmg: 24,
    desc: 'Aether gyros lock space into a molten vortex, then vent the chamber in a charged release',
  }),
  createManifestSpell({
    name: 'Foundry Causeway',
    icon: '⛓️',
    key: '/',
    color: '#ff8a4f',
    c2: '#78efff',
    core: '#fff0cf',
    mana: 28,
    cd: 1020,
    manifestStyle: 'aetherforge',
    manifestEffect: 'aetherforge_foundry',
    manifestProfile: 'conduit',
    manifestGlyph: '⛭',
    manifestDuration: 960,
    manifestArc: 20,
    manifestThickness: 12,
    manifestSegmentHp: 36,
    manifestPulseDmg: 4,
    desc: 'Forge a kinetic bridge that rails allies forward while grinding enemies and projectiles through hot conduits',
  }),
];

export const GAMMA_FIRE_HANDLERS = {
  ...HOLD_FIRE_HANDLERS,
  ...MANIFEST_FIRE_HANDLERS,
};

export const GAMMA_PROJ_HOOKS = {};

export const GAMMA_TRAIL_EMITTERS = {};

export const GAMMA_VFX_UPDATE = {
  ...HOLD_VFX_UPDATE,
  ...MANIFEST_VFX_UPDATE,
};

export const GAMMA_VFX_DRAW = {
  ...HOLD_VFX_DRAW,
  ...MANIFEST_VFX_DRAW,
};
