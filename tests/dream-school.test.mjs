import test from 'node:test';
import assert from 'node:assert/strict';

// Web Audio API fakes so the sound layer imports cleanly under Node.
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

const dream = await import('../js/spells/dream.js');
const registry = await import('../js/spell-registry.js');

const HEX = /^#[0-9a-f]{6}$/i;

test('Dream school exposes ten spells with a valid spell contract', () => {
  assert.equal(dream.SPELL_DEFS.length, 10);

  const names = new Set();
  const keys = new Set();
  for (const spell of dream.SPELL_DEFS) {
    assert.equal(typeof spell.name, 'string', 'name must be a string');
    assert.equal(typeof spell.desc, 'string', 'desc must be a string');
    assert.equal(typeof spell.key, 'string', `${spell.name} must define a key`);
    assert.match(spell.color, HEX, `${spell.name} color must be a hex color`);
    assert.match(spell.c2, HEX, `${spell.name} c2 must be a hex color`);
    assert.match(spell.core, HEX, `${spell.name} core must be a hex color`);
    assert.equal(typeof spell.mana, 'number', `${spell.name} must define mana`);
    assert.equal(typeof spell.cd, 'number', `${spell.name} must define a cooldown`);

    assert.ok(!names.has(spell.name), `${spell.name} is duplicated`);
    names.add(spell.name);
    assert.ok(!keys.has(spell.key), `key ${spell.key} is bound twice`);
    keys.add(spell.key);
  }
});

test('Dream projectile spells ride the shared dream trail', () => {
  const projectiles = dream.SPELL_DEFS.filter((s) => s.speed > 0);
  assert.ok(projectiles.length >= 3, 'expected at least three projectile spells');
  for (const spell of projectiles) {
    assert.equal(spell.trail, 'dream', `${spell.name} should emit the dream trail`);
  }
});

test('Dream school leans oneiric — sleep, dreams, nightmares and fae', () => {
  const allText = dream.SPELL_DEFS
    .map((spell) => `${spell.name} ${spell.desc}`)
    .join(' ')
    .toLowerCase();
  const oneiricTerms = [
    'sonho', 'sono', 'adormece', 'sono profundo', 'pesadelo', 'fada',
    'onírica', 'oníric', 'devaneio', 'miragem', 'sonhador', 'despertar', 'enxame',
  ];
  const matches = oneiricTerms.filter((term) => allText.includes(term));
  assert.ok(matches.length >= 7, `expected a strong dream/sleep tone; found ${matches.join(', ')}`);
});

test('Dream school is registered with metadata and runtime handlers', () => {
  const meta = registry.SCHOOL_INFO.find((school) => school.name === 'Dream');
  assert.ok(meta, 'Dream should be present in SCHOOL_INFO');
  assert.equal(meta.count, 10);
  assert.equal(meta.color, '#9d8bf0');
  assert.equal(meta.icon, '🌙');

  const fireHandlerFlags = [
    'isDeepSleep',
    'isDreamPrison',
    'isFalseAwakening',
    'isFairySwarm',
    'isReverieRay',
    'isMirageStep',
    'isDreamscape',
  ];
  for (const flag of fireHandlerFlags) {
    assert.equal(typeof registry.FIRE_HANDLERS[flag], 'function', `${flag} should be a registered fire handler`);
  }

  for (const flag of ['isLullaby', 'isNightmare']) {
    assert.ok(registry.PROJ_HOOKS[flag], `${flag} projectile hook should be registered`);
  }

  assert.equal(typeof registry.TRAIL_EMITTERS.dream, 'function', 'dream trail emitter should be registered');

  for (const type of [
    'dream_slumber',
    'dream_nightmare',
    'dream_cage',
    'dream_decoy',
    'dream_swarm',
    'dream_ray',
    'dream_mirage',
    'dream_scape',
  ]) {
    assert.equal(typeof registry.VFX_UPDATE[type], 'function', `${type} update should be registered`);
    assert.equal(typeof registry.VFX_DRAW[type], 'function', `${type} draw should be registered`);
  }
});

test('Dream spell flags resolve to a runtime handler or hook', () => {
  // Every spell that names a custom flag must have something wired to it,
  // otherwise the cast silently does nothing in the engine.
  const known = new Set([
    ...Object.keys(registry.FIRE_HANDLERS),
    ...Object.keys(registry.PROJ_HOOKS),
  ]);
  for (const spell of dream.SPELL_DEFS) {
    const customFlag = Object.keys(spell).find((k) => k.startsWith('is') && spell[k] === true);
    if (!customFlag) continue; // plain projectile (e.g. homing) — handled generically
    assert.ok(known.has(customFlag), `${spell.name} flag ${customFlag} has no handler/hook`);
  }
});
