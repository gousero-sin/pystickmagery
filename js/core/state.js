// ═══════════════════════════════════════════════════════
// state.js — Shared mutable game state
//
// All modules import this single object and mutate it.
// Using an object (not primitives) lets ES6 modules share
// the same reference across files.
// ═══════════════════════════════════════════════════════

export const W = 800;
export const H = 500;

// The single source of truth for all game state.
// Populated by main.js at startup; modules read/write freely.
export const state = {
  // ── Arrays mutated every frame ──
  particles: [],
  projectiles: [],
  vfxSequences: [],
  entities: [],
  platforms: [],
  spikes: [],
  shockwaves: [],
  dynamicLights: [],
  lightningBolts: [],
  gravityWells: [],
  fireWalls: [],
  poisonClouds: [],
  frozenEntities: new Map(),
  damageNumbers: [],
  timeBombs: [],
  manifestConstructs: [],
  manifestDraft: null,

  // ── Scalar state (wrapped so modules can mutate through the ref) ──
  screenShake: 0,
  t: 0,            // frame counter

  // ── Player (set by main.js) ──
  player: null,

  // ── Canvas dimensions (updated on resize) ──
  W,
  H,
};

// Helper: modules call state.shake(n) to bump screen shake safely
state.shake = function (n) {
  if (n > this.screenShake) this.screenShake = n;
};
