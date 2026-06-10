import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class FakeAudioNode {
  connect() { return this; }
  start() {}
  stop() {}
}

class FakeAudioParam {
  constructor(value = 0) {
    this.value = value;
  }

  setValueAtTime(value) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
}

class FakeGain extends FakeAudioNode {
  constructor() {
    super();
    this.gain = new FakeAudioParam(0);
  }
}

class FakeOscillator extends FakeAudioNode {
  constructor() {
    super();
    this.frequency = new FakeAudioParam(440);
    this.type = 'sine';
  }
}

class FakeFilter extends FakeAudioNode {
  constructor() {
    super();
    this.frequency = new FakeAudioParam(440);
    this.Q = new FakeAudioParam(1);
    this.type = 'lowpass';
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = new FakeAudioNode();
    this.sampleRate = 44100;
  }

  createOscillator() { return new FakeOscillator(); }
  createGain() { return new FakeGain(); }
  createBiquadFilter() { return new FakeFilter(); }
  createBufferSource() { return new FakeAudioNode(); }
  createBuffer() {
    return { getChannelData: () => new Float32Array(32) };
  }
}

globalThis.window = {
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
};

globalThis.performance = {
  now: () => 1000,
};

const mycobiota = await import('../js/spells/mycobiota.js');
const registry = await import('../js/spell-registry.js');
const { state } = await import('../js/core/state.js?v=7');

const HEX = /^#[0-9a-f]{6}$/i;

function resetState() {
  state.player = {
    x: 100,
    y: 260,
    w: 14,
    h: 30,
    facing: 1,
    mana: 140,
    maxMana: 140,
    hp: 100,
    maxHp: 100,
    castAnim: 0,
    castType: '',
    staffGlow: 0,
    vx: 0,
    vy: 0,
    inv: false,
    sq: 1,
    st: 1,
  };
  state.entities = [];
  state.projectiles = [];
  state.enemyProjectiles = [];
  state.vfxSequences = [];
  state.particles = [];
  state.dynamicLights = [];
  state.shockwaves = [];
  state.damageNumbers = [];
  state.frozenEntities = new Map();
  state.platforms = [];
  state.t = 0;
}

function addEnemy(x = 260, y = 240) {
  const enemy = {
    active: true,
    targetable: 'enemy',
    type: 'dummy',
    x,
    y,
    vx: 0,
    vy: 0,
    w: 16,
    h: 30,
    hp: 100,
    maxHp: 100,
    mass: 1,
  };
  state.entities.push(enemy);
  return enemy;
}

test('Mycobiota exposes ten fungi and bacteria spells with a valid contract', () => {
  assert.equal(mycobiota.SPELL_DEFS.length, 10);

  const names = new Set();
  const keys = new Set();
  for (const spell of mycobiota.SPELL_DEFS) {
    assert.equal(typeof spell.name, 'string');
    assert.equal(typeof spell.desc, 'string');
    assert.equal(typeof spell.key, 'string', `${spell.name} must define a key`);
    assert.match(spell.color, HEX, `${spell.name} color must be a hex color`);
    assert.match(spell.c2, HEX, `${spell.name} c2 must be a hex color`);
    assert.match(spell.core, HEX, `${spell.name} core must be a hex color`);
    assert.equal(typeof spell.mana, 'number', `${spell.name} must define mana`);
    assert.equal(typeof spell.cd, 'number', `${spell.name} must define a cooldown`);
    assert.ok(!names.has(spell.name), `${spell.name} is duplicated`);
    assert.ok(!keys.has(spell.key), `key ${spell.key} is bound twice`);
    names.add(spell.name);
    keys.add(spell.key);
  }
});

test('Mycobiota language stays cinematic, fungal, and bacterial', () => {
  const allText = mycobiota.SPELL_DEFS
    .map((spell) => `${spell.name} ${spell.desc}`)
    .join(' ')
    .toLowerCase();
  const requiredTerms = [
    'fungal',
    'bacteria',
    'bacillus',
    'biofilm',
    'cordyceps',
    'fermentation',
    'mycelium',
    'petri',
    'quorum',
    'spore',
    'colony',
    'time-lapse',
  ];
  const matches = requiredTerms.filter((term) => allText.includes(term));
  assert.ok(matches.length >= 10, `expected strong fungi/bacteria tone; found ${matches.join(', ')}`);
});

test('Mycobiota is registered with metadata and runtime handlers', () => {
  const meta = registry.SCHOOL_INFO.find((school) => school.name === 'Mycobiota');
  assert.ok(meta, 'Mycobiota should be present in SCHOOL_INFO');
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#8fcf5a');
  assert.equal(meta.icon, '🍄');

  for (const flag of [
    'isPetriBloom',
    'isQuorumPulse',
    'isMyceliumLash',
    'isBiofilmWard',
    'isAntibioticHalo',
    'isCordycepsMarionette',
    'isFruitingCrown',
  ]) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be a registered fire handler`);
  }

  for (const flag of ['isSporeNeedle', 'isBacillusSwarm', 'isFermentationFlask']) {
    assert.ok(registry.PROJ_HOOKS[flag], `${flag} projectile hook should be registered`);
  }

  assert.equal(typeof registry.TRAIL_EMITTERS.mycobiota, 'function');

  for (const type of [
    'mycobiota_spore_pop',
    'mycobiota_petri_bloom',
    'mycobiota_bacillus_split',
    'mycobiota_quorum_pulse',
    'mycobiota_mycelium_lash',
    'mycobiota_biofilm_ward',
    'mycobiota_fermentation_cloud',
    'mycobiota_antibiotic_halo',
    'mycobiota_cordyceps_marionette',
    'mycobiota_fruiting_crown',
  ]) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `${type} update should be registered`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `${type} draw should be registered`);
  }
});

test('Mycobiota spell flags resolve to a runtime handler or hook', () => {
  const known = new Set([
    ...Object.keys(registry.FIRE_HANDLERS),
    ...Object.keys(registry.PROJ_HOOKS),
  ]);
  for (const spell of mycobiota.SPELL_DEFS) {
    const customFlag = Object.keys(spell).find((key) => key.startsWith('is') && spell[key] === true);
    assert.ok(customFlag, `${spell.name} should declare a custom runtime flag`);
    assert.ok(known.has(customFlag), `${spell.name} flag ${customFlag} has no handler/hook`);
  }
});

test('Mycobiota lingering VFX have bounded lifetimes', () => {
  resetState();
  addEnemy();
  const petri = mycobiota.SPELL_DEFS.find((spell) => spell.isPetriBloom);
  const crown = mycobiota.SPELL_DEFS.find((spell) => spell.isFruitingCrown);

  registry.FIRE_HANDLERS.isPetriBloom(petri, 120, 250, 250, 250);
  registry.FIRE_HANDLERS.isFruitingCrown(crown, 120, 250, 250, 250);

  assert.ok(state.vfxSequences.some((vfx) => vfx.type === 'mycobiota_petri_bloom'));
  assert.ok(state.vfxSequences.some((vfx) => vfx.type === 'mycobiota_fruiting_crown'));

  for (let frame = 0; frame < 700; frame++) {
    for (const vfx of [...state.vfxSequences]) {
      vfx.age += 1;
      registry.VFX_UPDATE[vfx.type]?.(vfx);
      if (vfx.done) state.vfxSequences.splice(state.vfxSequences.indexOf(vfx), 1);
    }
  }

  assert.equal(state.vfxSequences.filter((vfx) => vfx.type.startsWith('mycobiota_')).length, 0);
});

test('Mycobiota player sprite has an explicit mushroom-hat branch', async () => {
  const source = await readFile(new URL('../arcane-modular.html', import.meta.url), 'utf8');
  assert.match(source, /isMycobiota/);
  assert.match(source, /mushroom-hat/i);
});
